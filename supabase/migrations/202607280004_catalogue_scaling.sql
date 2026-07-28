-- Catalogue scaling indexes. These are additive and do not alter creator,
-- R2, moderation or purchase data.
create index if not exists idx_products_published_trending
  on public.products (sales_count desc, published_at desc)
  where status = 'published';

create index if not exists idx_products_published_rating
  on public.products (rating_average desc, review_count desc, published_at desc)
  where status = 'published';

create index if not exists idx_products_published_price
  on public.products (price_pence, published_at desc)
  where status = 'published';

create index if not exists idx_products_published_category
  on public.products (category_id, published_at desc)
  where status = 'published';

create index if not exists idx_products_published_vendor
  on public.products (vendor_id, published_at desc)
  where status = 'published';

create index if not exists idx_product_images_cover_order
  on public.product_images (product_id, image_type, sort_order);

create index if not exists idx_product_versions_current_approved
  on public.product_versions (product_id, created_at desc)
  where is_current = true and status = 'approved';

create index if not exists idx_vendor_profiles_approved_name
  on public.vendor_profiles (display_name)
  where status = 'approved';
