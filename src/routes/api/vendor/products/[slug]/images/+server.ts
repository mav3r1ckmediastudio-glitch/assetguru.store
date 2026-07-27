import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const imageFile = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1).max(15 * 1024 ** 2),
  type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
});
const requestSchema = z.object({ files: z.array(imageFile).min(1).max(12) });
const completeSchema = z.object({
  items: z.array(
    z.object({
      path: z.string().min(3).max(700),
      altText: z.string().max(300),
      imageType: z.enum(['cover', 'gallery']),
      sortOrder: z.number().int().min(0).max(11)
    })
  ).min(1).max(12)
});

const safe = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-140) || 'image';

async function objectExists(path: string) {
  const admin = getSupabaseAdmin();
  const parts = path.split('/');
  const name = parts.pop()!;
  const folder = parts.join('/');
  const { data, error } = await admin.storage.from('product-images').list(folder, { limit: 20, search: name });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === name));
}

async function context(userId: string, slug: string) {
  const admin = getSupabaseAdmin();
  const { data: vendor, error: vendorError } = await admin
    .from('vendor_profiles')
    .select('id,status')
    .eq('user_id', userId)
    .single();
  if (vendorError) throw vendorError;
  if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });

  const { data: product, error: productError } = await admin
    .from('products')
    .select('id,status,images:product_images(id,storage_path,sort_order)')
    .eq('vendor_id', vendor.id)
    .eq('slug', slug)
    .single();
  if (productError) throw productError;
  if (!product) throw Object.assign(new Error('Product not found.'), { status: 404 });
  if (product.status === 'in_review') {
    throw Object.assign(new Error('Preview media cannot be changed while moderation is in progress.'), { status: 409 });
  }
  return { admin, vendor, product };
}

export async function POST({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = requestSchema.parse(await request.json());
    const { admin, vendor, product } = await context(user.id, params.slug);
    const existing = ((product.images as any[]) ?? []).length;
    if (existing + body.files.length > 12) {
      return json({ message: `A product can contain no more than 12 preview images. ${12 - existing} slots remain.` }, { status: 400 });
    }

    const uploads = [];
    for (const [index, file] of body.files.entries()) {
      const sortOrder = existing + index;
      const path = `${vendor.id}/${product.id}/images/${String(sortOrder + 1).padStart(2, '0')}-${crypto.randomUUID()}-${safe(file.name)}`;
      const { data, error } = await admin.storage
        .from('product-images')
        .createSignedUploadUrl(path, { upsert: false });
      if (error || !data) throw error ?? new Error('SIGNED_UPLOAD_FAILED');
      uploads.push({
        provider: 'supabase',
        bucket: 'product-images',
        path,
        token: data.token,
        role: `preview-${index}`,
        name: file.name,
        type: file.type,
        size: file.size,
        altText: `${product.id} preview ${sortOrder + 1}`,
        imageType: sortOrder === 0 ? 'cover' : 'gallery',
        sortOrder
      });
    }

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.preview_upload_started',
      entityType: 'product',
      entityId: product.id,
      metadata: { count: uploads.length },
      request
    });
    return json({ uploads });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? (error.issues[0]?.message ?? 'Choose valid preview images.') : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}

export async function PATCH({ locals, request, params }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = completeSchema.parse(await request.json());
    const { admin, vendor, product } = await context(user.id, params.slug);
    const prefix = `${vendor.id}/${product.id}/images/`;

    for (const item of body.items) {
      if (!item.path.startsWith(prefix)) {
        return json({ message: 'Invalid product preview path.' }, { status: 403 });
      }
      if (!(await objectExists(item.path))) {
        return json({ message: 'One or more preview uploads did not complete.' }, { status: 409 });
      }
    }

    const rows = body.items.map((item) => ({
      product_id: product.id,
      storage_path: item.path,
      alt_text: item.altText,
      image_type: item.imageType,
      sort_order: item.sortOrder
    }));
    const { error } = await admin.from('product_images').upsert(rows, { onConflict: 'product_id,storage_path' });
    if (error) throw error;

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.previews_updated',
      entityType: 'product',
      entityId: product.id,
      metadata: { count: rows.length },
      request
    });
    return json({ ok: true });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid preview completion request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
