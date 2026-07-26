import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';

const schema = z.object({
  displayName: z.string().trim().min(2).max(100),
  tagline: z.string().trim().max(180),
  bio: z.string().trim().max(5000),
  supportEmail: z.string().email(),
  responseTime: z.string().trim().max(80),
  featuredSlug: z.string(),
  accent: z.enum(['cyan', 'violet', 'magenta']),
  showSales: z.boolean(),
  showFollowers: z.boolean(),
  vacationMode: z.boolean(),
  sections: z.record(z.string(), z.boolean()),
  supportPromise: z.string().max(3000),
  updateCommitment: z.string().max(3000),
  licenceNotes: z.string().max(3000)
});

export async function PATCH({ locals, request }: import('./$types').RequestEvent) {
  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = schema.parse(await request.json());
    const admin = getSupabaseAdmin();

    const { data: vendor, error: vendorError } = await admin
      .from('vendor_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (vendorError) throw vendorError;
    if (!vendor) throw Object.assign(new Error('Vendor profile not found.'), { status: 404 });

    let featuredProductId: string | null = null;
    if (body.featuredSlug) {
      const { data: product, error: productError } = await admin
        .from('products')
        .select('id')
        .eq('vendor_id', vendor.id)
        .eq('slug', body.featuredSlug)
        .maybeSingle();
      if (productError) throw productError;
      featuredProductId = product?.id ?? null;
    }

    const { data, error } = await admin
      .from('vendor_profiles')
      .update({
        display_name: body.displayName,
        tagline: body.tagline,
        bio: body.bio,
        support_email: body.supportEmail,
        response_time: body.responseTime,
        featured_product_id: featuredProductId,
        storefront_accent: body.accent,
        show_sales: body.showSales,
        show_followers: body.showFollowers,
        vacation_mode: body.vacationMode,
        storefront_sections: body.sections,
        support_promise: body.supportPromise,
        update_commitment: body.updateCommitment,
        custom_licence_notes: body.licenceNotes
      })
      .eq('id', vendor.id)
      .select('*')
      .single();
    if (error) throw error;
    if (!data) throw new Error('Storefront update did not return a vendor profile.');

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'storefront.updated',
      entityType: 'vendor_profile',
      entityId: vendor.id,
      request
    });

    return json({
      storefront: {
        displayName: data.display_name,
        tagline: data.tagline,
        bio: data.bio,
        supportEmail: data.support_email,
        responseTime: data.response_time,
        featuredSlug: body.featuredSlug,
        accent: data.storefront_accent,
        showSales: data.show_sales,
        showFollowers: data.show_followers,
        vacationMode: data.vacation_mode,
        sections: data.storefront_sections,
        supportPromise: data.support_promise,
        updateCommitment: data.update_commitment,
        licenceNotes: data.custom_licence_notes
      }
    });
  } catch (error) {
    const e = apiError(error);
    return json(
      { message: error instanceof z.ZodError ? 'Please check the storefront details.' : e.message },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
