import { json } from '@sveltejs/kit';
import { CATEGORY_TAXONOMY } from '$lib/data/category-taxonomy';
import { apiError, getSupabaseAdmin, requireRole } from '$lib/server/supabase';

export async function GET({ locals }: import('./$types').RequestEvent) {
  try {
    await requireRole(locals, ['vendor', 'admin']);
    const admin = getSupabaseAdmin();
    const names = CATEGORY_TAXONOMY.map((item) => item.name);

    const { data: existing, error: existingError } = await admin
      .from('categories')
      .select('id,name,slug,visible,sort_order')
      .in('name', names);
    if (existingError) throw existingError;

    const existingNames = new Set((existing ?? []).map((item) => item.name));
    const missing = CATEGORY_TAXONOMY
      .filter((item) => !existingNames.has(item.name))
      .map((item) => ({
        name: item.name,
        slug: item.slug,
        description: item.description,
        icon: item.icon,
        accent: item.accent,
        sort_order: item.sortOrder,
        visible: true,
        featured: false
      }));

    if (missing.length) {
      const { error: insertError } = await admin.from('categories').insert(missing);
      if (insertError) throw insertError;
    }

    const { data: rows, error } = await admin
      .from('categories')
      .select('id,name,slug,visible,sort_order')
      .in('name', names)
      .eq('visible', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const databaseRows = new Map((rows ?? []).map((row) => [row.name, row]));
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
    return json({ message: mapped.status >= 500 ? 'Categories could not be loaded. Please try again.' : mapped.message }, { status: mapped.status });
  }
}
