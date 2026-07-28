import type { SupabaseClient } from '@supabase/supabase-js';
import { CATEGORY_LEGACY_ALIASES, CATEGORY_TAXONOMY } from '$lib/data/category-taxonomy';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  visible: boolean;
  sort_order: number;
};

/**
 * Restores the canonical AssetGuru taxonomy and safely folds the original
 * placeholder categories into their agreed replacements. This function is
 * idempotent and uses the service-role client supplied by server routes.
 */
export async function syncCategoryTaxonomy(admin: SupabaseClient<any>) {
  const { data: initialRows, error: initialError } = await admin
    .from('categories')
    .select('id,name,slug,visible,sort_order');
  if (initialError) throw initialError;

  let rows = (initialRows ?? []) as CategoryRow[];

  for (const item of CATEGORY_TAXONOMY) {
    const aliases = CATEGORY_LEGACY_ALIASES[item.name] ?? [];
    let canonical = rows.find((row) => row.name === item.name);
    const slugOwner = rows.find((row) => row.slug === item.slug);

    if (!canonical && slugOwner) canonical = slugOwner;

    if (!canonical) {
      const reusableAlias = rows.find((row) => aliases.includes(row.name));
      if (reusableAlias) {
        const { data, error } = await admin
          .from('categories')
          .update({
            name: item.name,
            slug: item.slug,
            description: item.description,
            icon: item.icon,
            accent: item.accent,
            sort_order: item.sortOrder,
            visible: true
          })
          .eq('id', reusableAlias.id)
          .select('id,name,slug,visible,sort_order')
          .single();
        if (error) throw error;
        canonical = data as CategoryRow;
        rows = rows.map((row) => row.id === reusableAlias.id ? canonical! : row);
      } else {
        const { data, error } = await admin
          .from('categories')
          .insert({
            name: item.name,
            slug: item.slug,
            description: item.description,
            icon: item.icon,
            accent: item.accent,
            sort_order: item.sortOrder,
            visible: true,
            featured: false
          })
          .select('id,name,slug,visible,sort_order')
          .single();
        if (error) throw error;
        canonical = data as CategoryRow;
        rows = [...rows, canonical];
      }
    } else {
      const { data, error } = await admin
        .from('categories')
        .update({
          name: item.name,
          slug: item.slug,
          description: item.description,
          icon: item.icon,
          accent: item.accent,
          sort_order: item.sortOrder,
          visible: true
        })
        .eq('id', canonical.id)
        .select('id,name,slug,visible,sort_order')
        .single();
      if (error) throw error;
      canonical = data as CategoryRow;
      rows = rows.map((row) => row.id === canonical!.id ? canonical! : row);
    }

    for (const alias of aliases) {
      const legacyRows = rows.filter((row) => row.name === alias && row.id !== canonical!.id);
      for (const legacy of legacyRows) {
        const { error: productError } = await admin
          .from('products')
          .update({ category_id: canonical.id })
          .eq('category_id', legacy.id);
        if (productError) throw productError;

        const { error: hideError } = await admin
          .from('categories')
          .update({ visible: false, featured: false })
          .eq('id', legacy.id);
        if (hideError) throw hideError;
      }
    }
  }

  const canonicalNames = CATEGORY_TAXONOMY.map((item) => item.name);
  const { data: finalRows, error: finalError } = await admin
    .from('categories')
    .select('id,name,slug,visible,sort_order')
    .in('name', canonicalNames)
    .eq('visible', true)
    .order('sort_order', { ascending: true });
  if (finalError) throw finalError;

  return finalRows ?? [];
}
