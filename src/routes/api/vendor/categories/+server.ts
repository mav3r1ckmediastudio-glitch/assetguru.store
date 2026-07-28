import { json } from '@sveltejs/kit';
import { CATEGORY_TAXONOMY } from '$lib/data/category-taxonomy';
import { syncCategoryTaxonomy } from '$lib/server/category-taxonomy';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';

export async function GET({ locals }: import('./$types').RequestEvent) {
  try {
    await requireRole(locals, ['vendor', 'admin']);
    const admin = getSupabaseAdmin();
    const rows = await syncCategoryTaxonomy(admin);
    const databaseRows = new Map(rows.map((row) => [row.name, row]));

    const categories = CATEGORY_TAXONOMY
      .filter((item) => databaseRows.has(item.name))
      .map((item) => ({
        id: databaseRows.get(item.name)!.id,
        name: item.name,
        slug: databaseRows.get(item.name)!.slug,
        subcategories: item.subcategories
      }));

    return json(
      { categories },
      { headers: { 'cache-control': 'private, no-store, no-cache, max-age=0' } }
    );
  } catch (error) {
    console.error('Vendor category loading failed', error);
    const mapped = apiError(error);
    return json(
      { message: mapped.status >= 500 ? 'Categories could not be loaded. Please try again.' : mapped.message },
      { status: mapped.status }
    );
  }
}
