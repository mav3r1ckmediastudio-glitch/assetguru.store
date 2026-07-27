import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { taxonomyCategory } from '$lib/data/category-taxonomy';
import {
  createR2UploadUrl,
  deletePackageObjects,
  packageObjectExists,
  r2StoredPath
} from '$lib/server/r2';

const MAX_R2_SINGLE_UPLOAD = 5 * 1024 ** 3;
const file = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1),
  type: z.string().max(120).default('application/octet-stream')
});
const packageFile = file.refine(
  (value) => value.size <= MAX_R2_SINGLE_UPLOAD,
  'Asset packages cannot exceed the 5 GiB single-upload limit.'
);
const documentationFile = file.refine(
  (value) => value.size <= 250 * 1024 ** 2,
  'Documentation cannot exceed 250 MB.'
);
const createSchema = z.object({
  version: z.string().trim().min(1).max(40),
  releaseNotes: z.string().trim().min(10).max(5000),
  package: packageFile,
  documentation: documentationFile.optional()
});
const completeSchema = z.object({ versionId: z.string().uuid(), submit: z.boolean().default(false) });
const deleteSchema = z.object({ versionId: z.string().uuid() });
const safe = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-150) || 'file';

export async function POST({ locals, request, params }: import('./$types').RequestEvent) {
  let createdVersionId: string | undefined;

  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdmin();

    const { data: vendor, error: vendorError } = await admin
      .from('vendor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    if (vendor.status !== 'approved') {
      return json({ message: 'Your creator account must be approved before uploading product versions.' }, { status: 403 });
    }

    const { data: product } = await admin
      .from('products')
      .select('id,slug,status,versions:product_versions(id)')
      .eq('vendor_id', vendor.id)
      .eq('slug', params.slug)
      .maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    if (product.status === 'in_review') {
      return json({ message: 'Wait for the current moderation review before uploading another version.' }, { status: 409 });
    }
    if (!((product.versions as any[]) ?? []).length && !body.documentation) {
      return json({ message: 'Attach installation documentation for the first product version.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await admin
      .from('product_versions')
      .select('id,status,package_path,documentation_path')
      .eq('product_id', product.id)
      .eq('version', body.version)
      .maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.status !== 'pending') {
        return json({ message: 'That version number already exists for this product.' }, { status: 409 });
      }
      const stalePaths = [existing.package_path, existing.documentation_path].filter(
        (value): value is string => Boolean(value)
      );
      if (stalePaths.length) await deletePackageObjects(admin, stalePaths);
      const { error: deleteError } = await admin.from('product_versions').delete().eq('id', existing.id);
      if (deleteError) throw deleteError;
    }

    const root = `${vendor.id}/${product.id}/${safe(body.version)}`;
    const packageKey = `${root}/package/${crypto.randomUUID()}-${safe(body.package.name)}`;
    const docsKey = body.documentation
      ? `${root}/documentation/${crypto.randomUUID()}-${safe(body.documentation.name)}`
      : null;
    const packagePath = r2StoredPath(packageKey);
    const docsPath = docsKey ? r2StoredPath(docsKey) : null;

    const { data: version, error: versionError } = await admin
      .from('product_versions')
      .insert({
        product_id: product.id,
        version: body.version,
        package_path: packagePath,
        documentation_path: docsPath,
        file_size_bytes: body.package.size,
        status: 'pending',
        is_current: false,
        release_notes: body.releaseNotes
      })
      .select('id')
      .single();
    if (versionError) throw versionError;
    createdVersionId = version.id;

    const uploads: Array<Record<string, unknown>> = [
      {
        provider: 'r2',
        url: await createR2UploadUrl(packageKey, body.package.type),
        path: packagePath,
        role: 'package',
        name: body.package.name,
        type: body.package.type,
        size: body.package.size
      }
    ];
    if (body.documentation && docsKey && docsPath) {
      uploads.push({
        provider: 'r2',
        url: await createR2UploadUrl(docsKey, body.documentation.type),
        path: docsPath,
        role: 'documentation',
        name: body.documentation.name,
        type: body.documentation.type,
        size: body.documentation.size
      });
    }

    const { error: retireError } = await admin
      .from('product_versions')
      .update({ status: 'rejected', is_current: false })
      .eq('product_id', product.id)
      .eq('status', 'pending')
      .neq('id', version.id);
    if (retireError) throw retireError;

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.version_created',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { productId: product.id, version: body.version, packageStorage: 'r2' },
      request
    });

    createdVersionId = undefined;
    return json({ versionId: version.id, uploads });
  } catch (error) {
    if (createdVersionId) await getSupabaseAdmin().from('product_versions').delete().eq('id', createdVersionId);
    const e = apiError(error);
    return json(
      {
        message:
          error instanceof z.ZodError
            ? (error.issues[0]?.message ?? 'Enter a valid version number, release notes and package.')
            : e.message
      },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = completeSchema.parse(await request.json());
    const admin = getSupabaseAdmin();

    const { data: vendor, error: vendorError } = await admin
      .from('vendor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });

    const { data: product } = await admin
      .from('products')
      .select('id,title,summary,description,subcategory,category:categories(name),images:product_images(storage_path)')
      .eq('vendor_id', vendor.id)
      .eq('slug', params.slug)
      .maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });

    const { data: version } = await admin
      .from('product_versions')
      .select('*')
      .eq('id', body.versionId)
      .eq('product_id', product.id)
      .maybeSingle();
    if (!version) return json({ message: 'Product version not found.' }, { status: 404 });

    if (!(await packageObjectExists(admin, version.package_path))) {
      return json({ message: 'The package upload did not complete.' }, { status: 409 });
    }
    if (!version.documentation_path) {
      return json({ message: 'Attach installation documentation before submitting the first version.' }, { status: 409 });
    }
    if (!(await packageObjectExists(admin, version.documentation_path))) {
      return json({ message: 'The documentation upload did not complete.' }, { status: 409 });
    }
    if (!body.submit) {
      await writeAudit({
        actorId: user.id,
        actorRole: 'vendor',
        action: 'product.version_upload_completed',
        entityType: 'product_version',
        entityId: version.id,
        metadata: { productId: product.id },
        request
      });
      return json({ ok: true, status: 'Draft' });
    }
    if (String(product.title ?? '').trim().length < 5) {
      return json({ message: 'Product titles must contain at least 5 characters.' }, { status: 400 });
    }
    if (String(product.summary ?? '').trim().length < 20) {
      return json({ message: 'The short summary must contain at least 20 characters.' }, { status: 400 });
    }
    if (String(product.description ?? '').trim().length < 60) {
      return json({ message: 'The full description must contain at least 60 characters.' }, { status: 400 });
    }
    const categoryName = (product.category as any)?.name ?? '';
    const taxonomy = taxonomyCategory(categoryName);
    if (!taxonomy || !taxonomy.subcategories.includes(String(product.subcategory ?? ''))) {
      return json({ message: 'Choose a valid category and subcategory before submitting for review.' }, { status: 400 });
    }
    if (((product.images as any[]) ?? []).length < 3) {
      return json({ message: 'Add at least three preview images before submitting for review.' }, { status: 409 });
    }

    const { error } = await admin.from('products').update({ status: 'in_review' }).eq('id', product.id);
    if (error) throw error;

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.version_submitted',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { productId: product.id },
      request
    });
    return json({ ok: true, status: 'In review' });
  } catch (error) {
    const e = apiError(error);
    return json(
      {
        message:
          error instanceof z.ZodError
            ? 'Invalid version completion request.'
            : e.message
      },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function DELETE({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = deleteSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: vendor, error: vendorError } = await admin
      .from('vendor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });

    const { data: product } = await admin
      .from('products')
      .select('id')
      .eq('vendor_id', vendor.id)
      .eq('slug', params.slug)
      .maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });

    const { data: version } = await admin
      .from('product_versions')
      .select('id,status,package_path,documentation_path')
      .eq('id', body.versionId)
      .eq('product_id', product.id)
      .maybeSingle();
    if (!version) return json({ ok: true });
    if (version.status !== 'pending') {
      return json({ message: 'Only an incomplete pending upload can be discarded.' }, { status: 409 });
    }

    const paths = [version.package_path, version.documentation_path].filter(
      (value): value is string => Boolean(value)
    );
    if (paths.length) {
      try {
        await deletePackageObjects(admin, paths);
      } catch {
        // The browser may have failed before either object existed.
      }
    }
    const { error } = await admin.from('product_versions').delete().eq('id', version.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid version cleanup request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
