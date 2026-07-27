import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { isR2ObjectKey, verifyR2Object } from '$lib/server/r2-storage';

const schema = z.object({
  mode: z.enum(['draft', 'review']),
  previewPaths: z.array(z.string().min(3).max(700)).min(3).max(12).optional()
});

async function legacyObjectExists(bucket: string, path: string) {
  const admin = getSupabaseAdmin();
  const parts = path.split('/');
  const name = parts.pop()!;
  const folder = parts.join('/');
  const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 20, search: name });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === name));
}

async function packageExists(path: string, expectedBytes?: number) {
  if (isR2ObjectKey(path)) return (await verifyR2Object(path, expectedBytes)).ok;
  return legacyObjectExists('asset-packages', path);
}

export async function POST({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();

    const { data: vendor, error: vendorError } = await admin
      .from('vendor_profiles')
      .select('id,status')
      .eq('user_id', user.id)
      .single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
    if (body.mode === 'review' && vendor.status !== 'approved') {
      return json({ message: 'Your creator account must be approved before submitting products for review.' }, { status: 403 });
    }

    const { data: product, error: productError } = await admin
      .from('products')
      .select('id,title,slug,versions:product_versions(id,package_path,documentation_path,file_size_bytes,created_at),images:product_images(storage_path,sort_order)')
      .eq('vendor_id', vendor.id)
      .eq('slug', params.slug)
      .single();
    if (productError) throw productError;
    if (!product) return json({ message: 'Product draft not found.' }, { status: 404 });

    const version = [...((product.versions as any[]) ?? [])]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
    if (!version || !(await packageExists(version.package_path, Number(version.file_size_bytes)))) {
      return json({ message: 'The asset package upload did not complete or could not be verified.' }, { status: 409 });
    }
    if (version.documentation_path && !(await packageExists(version.documentation_path))) {
      return json({ message: 'The documentation upload did not complete.' }, { status: 409 });
    }

    let previewPaths = [...((product.images as any[]) ?? [])]
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((image) => String(image.storage_path));

    if (body.previewPaths) {
      const prefix = `${vendor.id}/${product.id}/previews/`;
      if (body.previewPaths.some((path) => !path.startsWith(prefix) || path.includes('..'))) {
        return json({ message: 'Invalid preview upload path.' }, { status: 403 });
      }
      for (const path of body.previewPaths) {
        if (!(await legacyObjectExists('product-images', path))) {
          return json({ message: 'One or more preview uploads did not complete.' }, { status: 409 });
        }
      }
      const existingSet = new Set(previewPaths);
      const incomingSet = new Set(body.previewPaths);
      const samePaths = existingSet.size === incomingSet.size && [...incomingSet].every((path) => existingSet.has(path));
      if (!samePaths) {
        const { error: deleteRowsError } = await admin.from('product_images').delete().eq('product_id', product.id);
        if (deleteRowsError) throw deleteRowsError;
        const rows = body.previewPaths.map((path, index) => ({
          product_id: product.id,
          storage_path: path,
          alt_text: `${product.title} preview ${index + 1}`,
          image_type: index === 0 ? 'cover' : 'gallery',
          sort_order: index
        }));
        const { error: insertError } = await admin.from('product_images').insert(rows);
        if (insertError) throw insertError;
      }
      previewPaths = body.previewPaths;
    } else {
      for (const path of previewPaths) {
        if (!(await legacyObjectExists('product-images', path))) {
          return json({ message: 'One or more preview uploads did not complete.' }, { status: 409 });
        }
      }
    }

    if (body.mode === 'review' && previewPaths.length < 3) {
      return json({ message: 'Upload at least three preview images before submitting for review.' }, { status: 409 });
    }

    const next = body.mode === 'review' ? 'in_review' : 'draft';
    const { error: updateError } = await admin.from('products').update({ status: next }).eq('id', product.id);
    if (updateError) throw updateError;

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: body.mode === 'review' ? 'product.submitted_for_review' : 'product.draft_saved',
      entityType: 'product',
      entityId: product.id,
      metadata: {
        packageStorage: isR2ObjectKey(version.package_path) ? 'r2' : 'supabase',
        previewCount: previewPaths.length
      },
      request
    });
    return json({ ok: true, status: next });
  } catch (error) {
    console.error(error);
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid completion request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
