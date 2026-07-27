import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireUser, writeAudit } from '$lib/server/supabase';
import { createR2DownloadUrl, isR2ObjectKey } from '$lib/server/r2-storage';

const schema = z.object({ slug: z.string().min(1), version: z.string().min(1) });

export async function POST({ locals, request }: import('./$types').RequestEvent) {
  try {
    const user = await requireUser(locals);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();
    const { data: product } = await admin.from('products').select('id,title').eq('slug', body.slug).single();
    if (!product) return json({ message: 'Product not found.' }, { status: 404 });
    const { data: entitlement } = await admin
      .from('entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .eq('status', 'active')
      .single();
    if (!entitlement) return json({ message: 'This product is not in your library.' }, { status: 403 });
    const { data: version } = await admin
      .from('product_versions')
      .select('*')
      .eq('product_id', product.id)
      .eq('version', body.version)
      .eq('status', 'approved')
      .single();
    if (!version) return json({ message: 'That approved version is not available.' }, { status: 404 });

    let url: string;
    if (isR2ObjectKey(version.package_path)) {
      const storedName = String(version.package_path).split('/').pop() ?? 'asset-package';
      const extension = storedName.includes('.') ? `.${storedName.split('.').pop()}` : '';
      url = createR2DownloadUrl(version.package_path, `${body.slug}-${body.version}${extension}`, 300);
    } else {
      const { data: signed, error } = await admin.storage
        .from('asset-packages')
        .createSignedUrl(version.package_path, 300, { download: `${body.slug}-${body.version}` });
      if (error || !signed) throw error ?? new Error('SIGNED_URL_FAILED');
      url = signed.signedUrl;
    }

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    await admin.from('download_events').insert({
      user_id: user.id,
      entitlement_id: entitlement.id,
      product_version_id: version.id,
      ip_address: forwarded ?? null,
      user_agent: request.headers.get('user-agent')
    });
    await writeAudit({
      actorId: user.id,
      actorRole: 'buyer',
      action: 'asset.downloaded',
      entityType: 'product_version',
      entityId: version.id,
      metadata: { product: body.slug, version: body.version, storage: isR2ObjectKey(version.package_path) ? 'r2' : 'supabase' },
      request
    });
    return json({
      url,
      downloadedAt: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date())
    });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Invalid download request.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
