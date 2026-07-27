import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const imageFile = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(15 * 1024 ** 2),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
});
const prepareSchema = z.object({ files: z.array(imageFile).min(3).max(12) });
const pathsSchema = z.object({ paths: z.array(z.string().min(3).max(700)).min(1).max(12) });
const completeSchema = pathsSchema.extend({ paths: z.array(z.string().min(3).max(700)).min(3).max(12) });
const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-150) || 'image';

async function loadOwnedProduct(userId: string, slug: string) {
  const admin = getSupabaseAdmin();
  const { data: vendor, error: vendorError } = await admin.from('vendor_profiles').select('id,status').eq('user_id', userId).single();
  if (vendorError) throw vendorError;
  if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });
  const { data: product } = await admin.from('products').select('id,title,status').eq('vendor_id', vendor.id).eq('slug', slug).maybeSingle();
  if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
  return { admin, vendor, product };
}

function assertOwnedPaths(paths: string[], vendorId: string, productId: string) {
  const prefix = `${vendorId}/${productId}/previews/`;
  if (paths.some((path) => !path.startsWith(prefix) || path.includes('..'))) {
    throw Object.assign(new Error('Invalid preview upload path.'), { status: 403 });
  }
}

async function objectExists(path: string) {
  const admin = getSupabaseAdmin();
  const parts = path.split('/');
  const name = parts.pop()!;
  const folder = parts.join('/');
  const { data, error } = await admin.storage.from('product-images').list(folder, { limit: 20, search: name });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === name));
}

export async function POST({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = prepareSchema.parse(await request.json());
    const { admin, vendor, product } = await loadOwnedProduct(user.id, params.slug);
    if (vendor.status !== 'approved') return json({ message: 'Your creator account must be approved before uploading previews.' }, { status: 403 });
    if (product.status === 'in_review') return json({ message: 'Wait for the current moderation review before replacing previews.' }, { status: 409 });
    const attemptId = crypto.randomUUID();
    const uploads = [];
    for (const [index, file] of body.files.entries()) {
      const path = `${vendor.id}/${product.id}/previews/${attemptId}/${String(index + 1).padStart(2, '0')}-${safe(file.name)}`;
      const { data, error } = await admin.storage.from('product-images').createSignedUploadUrl(path, { upsert: false });
      if (error || !data) throw error ?? new Error('SIGNED_UPLOAD_FAILED');
      uploads.push({ storage: 'supabase' as const, bucket: 'product-images', path, token: data.token, role: `preview-${index}`, ...file });
    }
    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.previews_upload_started',
      entityType: 'product',
      entityId: product.id,
      metadata: { count: uploads.length },
      request
    });
    return json({ uploads });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? (error.issues[0]?.message ?? 'Choose between 3 and 12 valid preview images.') : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = completeSchema.parse(await request.json());
    const { admin, vendor, product } = await loadOwnedProduct(user.id, params.slug);
    assertOwnedPaths(body.paths, vendor.id, product.id);
    for (const path of body.paths) {
      if (!(await objectExists(path))) return json({ message: 'One or more preview uploads did not complete.' }, { status: 409 });
    }
    const { data: oldImages, error: oldError } = await admin.from('product_images').select('id,storage_path').eq('product_id', product.id);
    if (oldError) throw oldError;
    const oldPaths = (oldImages ?? []).map((item) => item.storage_path).filter(Boolean);
    const oldIds = (oldImages ?? []).map((item) => item.id).filter(Boolean);
    const rows = body.paths.map((path, index) => ({
      product_id: product.id,
      storage_path: path,
      alt_text: `${product.title} preview ${index + 1}`,
      image_type: index === 0 ? 'cover' : 'gallery',
      sort_order: index
    }));
    const { error: insertError } = await admin.from('product_images').insert(rows);
    if (insertError) throw insertError;
    if (oldIds.length) {
      const { error: deleteRowsError } = await admin.from('product_images').delete().in('id', oldIds);
      if (deleteRowsError) {
        await admin.from('product_images').delete().eq('product_id', product.id).in('storage_path', body.paths);
        throw deleteRowsError;
      }
    }
    const obsolete = oldPaths.filter((path) => !body.paths.includes(path));
    if (obsolete.length) {
      const { error } = await admin.storage.from('product-images').remove(obsolete);
      if (error) console.error('Old preview cleanup failed', error);
    }
    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.previews_updated',
      entityType: 'product',
      entityId: product.id,
      metadata: { count: body.paths.length },
      request
    });
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Choose between 3 and 12 preview images.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function DELETE({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = pathsSchema.parse(await request.json());
    const { admin, vendor, product } = await loadOwnedProduct(user.id, params.slug);
    assertOwnedPaths(body.paths, vendor.id, product.id);
    const { data: referenced, error: referenceError } = await admin.from('product_images').select('storage_path').eq('product_id', product.id).in('storage_path', body.paths);
    if (referenceError) throw referenceError;
    const referencedSet = new Set((referenced ?? []).map((item) => item.storage_path));
    const disposable = body.paths.filter((path) => !referencedSet.has(path));
    if (disposable.length) {
      const { error } = await admin.storage.from('product-images').remove(disposable);
      if (error) throw error;
    }
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid preview cleanup request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
