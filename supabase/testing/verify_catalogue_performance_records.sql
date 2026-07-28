-- STAGING ONLY. Read-only verification for generated catalogue fixtures.
select
  count(*) as generated_products,
  count(*) filter (where status = 'published') as published_products,
  count(*) filter (where price_pence = 0) as free_products,
  count(*) filter (where source_files) as source_file_products,
  count(distinct category_id) as covered_categories,
  min(published_at) as oldest_fixture,
  max(published_at) as newest_fixture
from public.products
where slug like 'perf-test-%';

select
  count(*) as generated_versions,
  count(*) filter (where pv.is_current and pv.status = 'approved') as current_approved_versions
from public.product_versions pv
join public.products p on p.id = pv.product_id
where p.slug like 'perf-test-%';

select
  count(*) as generated_images,
  count(*) filter (where pi.image_type = 'cover') as cover_images
from public.product_images pi
join public.products p on p.id = pi.product_id
where p.slug like 'perf-test-%';
