-- STAGING ONLY. Generates 120 lightweight published records for pagination tests.
-- Every generated slug starts with perf-test- so cleanup is deterministic.
do $$
declare
  test_vendor uuid;
  category_ids uuid[];
  created_product uuid;
  i integer;
begin
  select id into test_vendor
  from public.vendor_profiles
  where status = 'approved'
  order by created_at
  limit 1;

  if test_vendor is null then
    raise exception 'Create or approve a staging vendor before generating performance records.';
  end if;

  select array_agg(id order by sort_order) into category_ids
  from public.categories
  where visible = true;

  if coalesce(array_length(category_ids, 1), 0) = 0 then
    raise exception 'No visible categories exist in staging.';
  end if;

  for i in 1..120 loop
    insert into public.products (
      vendor_id, category_id, slug, title, subcategory, summary, description,
      price_pence, extended_price_pence, status, compatibility, max_version,
      source_files, dependencies, download_size_bytes, performance, features,
      contents, tags, formats, licence, sales_count, rating_average, review_count,
      published_at
    ) values (
      test_vendor,
      category_ids[((i - 1) % array_length(category_ids, 1)) + 1],
      'perf-test-' || lpad(i::text, 3, '0'),
      '[PERF TEST] Catalogue Asset ' || lpad(i::text, 3, '0'),
      'Performance fixture',
      'Generated staging record for catalogue pagination and filtering tests.',
      'This record is synthetic and must never be created in production.',
      499 + ((i % 8) * 500),
      1499 + ((i % 8) * 1000),
      'published',
      'GameGuru MAX',
      case when i % 3 = 0 then '2026+' when i % 3 = 1 then '2025+' else 'Any MAX build' end,
      i % 2 = 0,
      'None',
      1048576 * (5 + i),
      case when i % 3 = 0 then 'Lightweight' when i % 3 = 1 then 'Mid-range' else 'High detail' end,
      array['Generated fixture','Pagination test'],
      array['Synthetic content only'],
      array['performance','fixture','catalogue'],
      array['FPE'],
      'Standard commercial licence',
      (i * 7) % 300,
      case when i % 5 = 0 then 0 else 4.5 + ((i % 5)::numeric / 10) end,
      case when i % 5 = 0 then 0 else 3 + (i % 40) end,
      timezone('utc', now()) - make_interval(hours => i)
    )
    on conflict (slug) do update set updated_at = timezone('utc', now())
    returning id into created_product;

    insert into public.product_versions (
      product_id, version, package_path, release_notes, file_size_bytes,
      is_current, status, approved_at
    ) values (
      created_product,
      '1.0.' || i,
      'performance-test/not-downloadable-' || i || '.zip',
      'Synthetic staging fixture.',
      1048576 * (5 + i),
      true,
      'approved',
      timezone('utc', now())
    )
    on conflict (product_id, version) do nothing;
  end loop;
end $$;
