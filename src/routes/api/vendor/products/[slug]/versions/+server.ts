import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import {
  createR2UploadTarget,
  deleteR2Objects,
  isR2ObjectKey,
  makeR2ObjectKey,
  verifyR2Object
} from '$lib/server/r2-storage';

const file = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1),
  type: z.string().max(120).default('application/octet-stream')
});
const packageFile = file.refine((value) => value.size <= 5 * 1024 ** 3, 'Asset packages cannot exceed 5 GB.');
const documentationFile = file.refine((value) => value.size <= 250 * 1024 ** 2, 'Documentation cannot exceed 250 MB.');
const createSchema = z.object({
  version: z.string().trim().min(1).max(40),
  releaseNotes: z.string().trim().min(10).max(5000),
  package: packageFile,
  documentation: documentationFile.optional()
});
const completeSchema = z.object({
  versionId: z.string().uuid(),
  packageSize: z.number().int().min(1),
  documentationSize: z.number().int().min(1).optional()
});
const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-150) || 'file';

const objectName = (path?: string | null) => {
  if (!path) return '';
  const value = path.split('/').filter(Boolean).pop() ?? '';
  try { return decodeURIComponent(value); } catch { return value; }
};
const formatBytes = (value: number | null | undefined) => {
  const bytes = Number(value ?? 0);
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  return `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`;
};
const formatDate = (value: string) => new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', year:'numeric' }).format(new Date(value));

async function removeStoredObjects(paths: Array<string | null | undefined>) {
  const admin = getSupabaseAdmin();
  const r2Paths = paths.filter(isR2ObjectKey);
  const legacyPaths = paths.filter((path): path is string => Boolean(path) && !isR2ObjectKey(path));
  if (r2Paths.length) await deleteR2Objects(r2Paths);
  if (legacyPaths.length) {
    const { error } = await admin.storage.from('asset-packages').remove(legacyPaths);
    if (error) throw error;
  }
}

export async function GET({ locals, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const admin = getSupabaseAdmin();
    const { data: vendor, error: vendorError } = await admin.from('vendor_profiles').select('id').eq('user_id', user.id).single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    const { data: product } = await admin.from('products').select('id').eq('vendor_id', vendor.id).eq('slug', params.slug).maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    const { data: versions, error } = await admin
      .from('product_versions')
      .select('id,version,status,is_current,package_path,documentation_path,file_size_bytes,release_notes,created_at')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    const storedVersions = await Promise.all((versions ?? []).map(async (entry) => {
      const packageCheck = isR2ObjectKey(entry.package_path)
        ? await verifyR2Object(entry.package_path, Number(entry.file_size_bytes))
        : { ok: Boolean(entry.package_path) };
      const documentationCheck = !entry.documentation_path || !isR2ObjectKey(entry.documentation_path)
        ? { ok: true }
        : await verifyR2Object(entry.documentation_path);
      return {
        id: entry.id,
        version: entry.version,
        status: entry.status,
        isCurrent: Boolean(entry.is_current),
        verified: packageCheck.ok && documentationCheck.ok,
        size: formatBytes(entry.file_size_bytes),
        created: formatDate(entry.created_at),
        releaseNotes: entry.release_notes ?? '',
        packageName: objectName(entry.package_path) || `asset-package-${entry.version}.zip`,
        documentationName: objectName(entry.documentation_path) || undefined
      };
    }));
    return json({ versions: storedVersions });
  } catch (error) {
    const e = apiError(error);
    return json({ message: e.message }, { status: e.status });
  }
}

export async function POST({ locals, request, params }: import('./$types').RequestEvent) {
  let createdVersionId: string | undefined;
  let createdKeys: string[] = [];
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = createSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: vendor, error: vendorError } = await admin.from('vendor_profiles').select('id,status').eq('user_id', user.id).single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    if (vendor.status !== 'approved') return json({ message: 'Your creator account must be approved before uploading product versions.' }, { status: 403 });

    const { data: product } = await admin.from('products').select('id,slug,status').eq('vendor_id', vendor.id).eq('slug', params.slug).maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    if (product.status === 'in_review') return json({ message: 'Wait for the current moderation review before uploading another version.' }, { status: 409 });

    const { data: existing, error: existingError } = await admin
      .from('product_versions')
      .select('id,status,package_path,documentation_path')
      .eq('product_id', product.id)
      .eq('version', body.version)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      if (existing.status !== 'pending') return json({ message: 'That version number already exists for this product.' }, { status: 409 });
      await removeStoredObjects([existing.package_path, existing.documentation_path]);
      const { error: deleteError } = await admin.from('product_versions').delete().eq('id', existing.id);
      if (deleteError) throw deleteError;
    }

    const attemptId = crypto.randomUUID();
    const root = makeR2ObjectKey(['vendors', vendor.id, 'products', product.id, 'versions', safe(body.version), attemptId]);
    const packagePath = `${root}/package/${safe(body.package.name)}`;
    const docsPath = body.documentation ? `${root}/documentation/${safe(body.documentation.name)}` : null;
    createdKeys = [packagePath, docsPath].filter((value): value is string => Boolean(value));

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

    const uploads = [
      createR2UploadTarget({ key: packagePath, role: 'package', ...body.package }),
      ...(body.documentation && docsPath
        ? [createR2UploadTarget({ key: docsPath, role: 'documentation', ...body.documentation })]
        : [])
    ];

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
      action: 'product.version_upload_started',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { productId: product.id, version: body.version, storage: 'r2', packageBytes: body.package.size },
      request
    });
    createdVersionId = undefined;
    createdKeys = [];
    return json({ versionId: version.id, uploads });
  } catch (error) {
    if (createdVersionId) await getSupabaseAdmin().from('product_versions').delete().eq('id', createdVersionId);
    if (createdKeys.length) {
      try { await deleteR2Objects(createdKeys); } catch (cleanupError) { console.error('R2 version cleanup failed', cleanupError); }
    }
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? (error.issues[0]?.message ?? 'Enter a valid version number, release notes and package.') : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = completeSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: vendor, error: vendorError } = await admin.from('vendor_profiles').select('id').eq('user_id', user.id).single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    const { data: product } = await admin.from('products').select('id').eq('vendor_id', vendor.id).eq('slug', params.slug).maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    const { data: version } = await admin.from('product_versions').select('*').eq('id', body.versionId).eq('product_id', product.id).maybeSingle();
    if (!version) return json({ message: 'Product version not found.' }, { status: 404 });
    if (!isR2ObjectKey(version.package_path)) return json({ message: 'This version was not prepared for Cloudflare R2.' }, { status: 409 });
    if (Number(version.file_size_bytes) !== body.packageSize) return json({ message: 'The selected package no longer matches the prepared upload.' }, { status: 409 });

    const packageCheck = await verifyR2Object(version.package_path, body.packageSize);
    if (!packageCheck.ok) {
      return json({ message: packageCheck.reason === 'size' ? 'The R2 package size does not match the selected file.' : 'The package upload did not complete.' }, { status: 409 });
    }
    if (version.documentation_path) {
      if (!body.documentationSize) return json({ message: 'Documentation verification data is missing.' }, { status: 400 });
      const documentationCheck = await verifyR2Object(version.documentation_path, body.documentationSize);
      if (!documentationCheck.ok) {
        return json({ message: documentationCheck.reason === 'size' ? 'The R2 documentation size does not match the selected file.' : 'The documentation upload did not complete.' }, { status: 409 });
      }
    }

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.version_upload_verified',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { productId: product.id, storage: 'r2', packageBytes: packageCheck.bytes },
      request
    });
    return json({ ok: true, verified: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid version verification request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

const cancelSchema = z.object({ versionId: z.string().uuid() });

export async function DELETE({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = cancelSchema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: vendor, error: vendorError } = await admin.from('vendor_profiles').select('id').eq('user_id', user.id).single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    const { data: product } = await admin.from('products').select('id').eq('vendor_id', vendor.id).eq('slug', params.slug).maybeSingle();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    const { data: version } = await admin
      .from('product_versions')
      .select('id,status,package_path,documentation_path')
      .eq('id', body.versionId)
      .eq('product_id', product.id)
      .maybeSingle();
    if (!version) return json({ ok: true });
    if (version.status !== 'pending') return json({ message: 'Only an unfinished pending upload can be cancelled.' }, { status: 409 });
    await removeStoredObjects([version.package_path, version.documentation_path]);
    const { error: deleteError } = await admin.from('product_versions').delete().eq('id', version.id);
    if (deleteError) throw deleteError;
    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.version_upload_cancelled',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { productId: product.id },
      request
    });
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid version cancellation request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
