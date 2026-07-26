begin;

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'buyer' check (role in ('buyer','vendor','admin')),
  display_name text not null default '',
  email text not null default '',
  country text not null default 'United Kingdom',
  studio text not null default '',
  avatar_path text,
  avatar_tone text not null default 'cyan' check (avatar_tone in ('cyan','violet','magenta')),
  marketing_opt_in boolean not null default false,
  update_emails boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  handle text not null,
  tagline text not null default '',
  bio text not null default '',
  support_email text not null default '',
  response_time text not null default 'Within 2 business days',
  location text not null default '',
  specialties text[] not null default '{}',
  avatar_path text,
  banner_path text,
  status text not null default 'pending' check (status in ('pending','more_information','approved','suspended')),
  status_reason text not null default '',
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_payouts_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  commission_percent numeric(5,2),
  payout_schedule text not null default 'Managed by Stripe',
  vacation_mode boolean not null default false,
  show_sales boolean not null default true,
  show_followers boolean not null default true,
  storefront_accent text not null default 'cyan' check (storefront_accent in ('cyan','violet','magenta')),
  storefront_sections jsonb not null default '{"hero":true,"featured":true,"bestsellers":true,"latest":true,"about":true}'::jsonb,
  support_promise text not null default '',
  update_commitment text not null default '',
  custom_licence_notes text not null default '',
  featured_product_id uuid,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  icon text not null default '⬡',
  accent text not null default 'cyan' check (accent in ('cyan','magenta','violet','amber','green','blue','red')),
  sort_order integer not null default 0,
  visible boolean not null default true,
  featured boolean not null default false,
  commission_override numeric(5,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique,
  title text not null,
  subcategory text not null default '',
  summary text not null default '',
  description text not null default '',
  price_pence integer not null default 0 check (price_pence >= 0),
  extended_price_pence integer check (extended_price_pence is null or extended_price_pence >= price_pence),
  status text not null default 'draft' check (status in ('draft','in_review','changes_requested','published','retired','rejected')),
  badge text,
  compatibility text not null default 'GameGuru MAX',
  max_version text not null default 'Any MAX build',
  source_files boolean not null default false,
  dependencies text not null default 'None',
  download_size_bytes bigint not null default 0,
  performance text not null default 'Mid-range',
  features text[] not null default '{}',
  contents text[] not null default '{}',
  tags text[] not null default '{}',
  formats text[] not null default '{}',
  licence text not null default 'Standard commercial licence',
  moderation_notes text not null default '',
  view_count integer not null default 0,
  sales_count integer not null default 0,
  rating_average numeric(3,2) not null default 0,
  review_count integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.vendor_profiles
  add constraint vendor_profiles_featured_product_fk
  foreign key (featured_product_id) references public.products(id) on delete set null;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  image_type text not null default 'gallery' check (image_type in ('cover','gallery')),
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique(product_id, storage_path)
);

create table if not exists public.product_versions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  version text not null,
  package_path text not null,
  documentation_path text,
  release_notes text not null default '',
  file_size_bytes bigint not null default 0,
  is_current boolean not null default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected','retired')),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  unique(product_id, version)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_number text not null unique,
  status text not null default 'pending' check (status in ('pending','paid','partially_refunded','refunded','failed')),
  currency text not null default 'gbp',
  subtotal_pence integer not null default 0,
  tax_pence integer not null default 0,
  total_pence integer not null default 0,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  payment_method_summary text not null default 'Stripe',
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  vendor_id uuid not null references public.vendor_profiles(id) on delete restrict,
  product_version_id uuid not null references public.product_versions(id) on delete restrict,
  licence_type text not null check (licence_type in ('standard','extended')),
  unit_amount_pence integer not null check (unit_amount_pence >= 0),
  tax_amount_pence integer not null default 0,
  commission_pence integer not null default 0,
  vendor_net_pence integer not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','refund_requested','refunded','refund_declined')),
  stripe_transfer_id text,
  refund_amount_pence integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique(order_id, product_id)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  purchased_version_id uuid not null references public.product_versions(id) on delete restrict,
  licence_type text not null check (licence_type in ('standard','extended')),
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  unique(user_id, product_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  status text not null default 'published' check (status in ('pending','published','rejected')),
  vendor_response text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(user_id, product_id)
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendor_profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  category text not null check (category in ('asset_support','order_billing','refund_request','account')),
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open','waiting_on_creator','resolved')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  ticket_id uuid references public.support_tickets(id) on delete set null,
  reason text not null,
  amount_pence integer not null,
  status text not null default 'open' check (status in ('open','investigating','approved','declined','refunded')),
  stripe_refund_id text,
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique(order_item_id)
);

create table if not exists public.admin_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique,
  case_type text not null check (case_type in ('refund','chargeback','copyright','content_report')),
  status text not null default 'open' check (status in ('open','investigating','resolved','declined')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  product_id uuid references public.products(id) on delete set null,
  vendor_id uuid references public.vendor_profiles(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  amount_pence integer not null default 0,
  summary text not null default '',
  evidence jsonb not null default '{}'::jsonb,
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  stripe_transfer_id text unique,
  stripe_payout_id text,
  gross_pence integer not null default 0,
  commission_pence integer not null default 0,
  net_pence integer not null default 0,
  refunded_pence integer not null default 0,
  currency text not null default 'gbp',
  status text not null default 'pending' check (status in ('pending','paid','partially_reversed','reversed','failed')),
  scheduled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'system',
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  body text not null,
  href text,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.marketplace_settings (
  id smallint primary key default 1 check (id = 1),
  marketplace_name text not null default 'AssetGuru',
  support_email text not null default 'support@assetguru.example',
  default_commission_percent numeric(5,2) not null default 15,
  minimum_price_pence integer not null default 299,
  payout_delay_days integer not null default 14,
  auto_approve_updates boolean not null default false,
  require_human_review boolean not null default true,
  allow_free_assets boolean not null default true,
  allow_ai_assisted boolean not null default true,
  maintenance_mode boolean not null default false,
  mature_content text not null default 'Tagged and moderated',
  buyer_review_delay_days integer not null default 3,
  refund_window_days integer not null default 14,
  featured_label text not null default 'Guru Pick',
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.creator_follows (
  user_id uuid not null references public.profiles(id) on delete cascade,
  vendor_id uuid not null references public.vendor_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, vendor_id)
);

create table if not exists public.favourites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, product_id)
);

create table if not exists public.download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entitlement_id uuid not null references public.entitlements(id) on delete cascade,
  product_version_id uuid not null references public.product_versions(id) on delete restrict,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_products_public on public.products(status, published_at desc);
create index if not exists idx_products_vendor on public.products(vendor_id, updated_at desc);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_order_items_vendor on public.order_items(vendor_id, created_at desc);
create index if not exists idx_entitlements_user on public.entitlements(user_id, created_at desc);
create index if not exists idx_reviews_product on public.reviews(product_id, status, created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, read_at, created_at desc);
create index if not exists idx_creator_follows_vendor on public.creator_follows(vendor_id, created_at desc);
create index if not exists idx_audit_created on public.audit_log(created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger vendor_profiles_set_updated_at before update on public.vendor_profiles for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger reviews_set_updated_at before update on public.reviews for each row execute function public.set_updated_at();
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();
create trigger refund_requests_set_updated_at before update on public.refund_requests for each row execute function public.set_updated_at();
create trigger admin_cases_set_updated_at before update on public.admin_cases for each row execute function public.set_updated_at();
create trigger payouts_set_updated_at before update on public.payouts for each row execute function public.set_updated_at();
create trigger marketplace_settings_set_updated_at before update on public.marketplace_settings for each row execute function public.set_updated_at();

create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(value,'')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.make_reference(prefix text)
returns text
language sql
volatile
as $$
  select prefix || '-' || to_char(timezone('utc', now()), 'YYMMDD') || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  display text;
  vendor_slug text;
begin
  requested_role := case when new.raw_user_meta_data->>'role' = 'vendor' then 'vendor' else 'buyer' end;
  display := coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1));

  insert into public.profiles(id, role, display_name, email)
  values(new.id, requested_role, display, coalesce(new.email,''));

  if requested_role = 'vendor' then
    vendor_slug := public.slugify(display) || '-' || substr(new.id::text, 1, 6);
    insert into public.vendor_profiles(user_id, slug, display_name, handle, support_email)
    values(new.id, vendor_slug, display, '@' || vendor_slug, coalesce(new.email,''));
  end if;

  insert into public.audit_log(actor_id, actor_role, action, entity_type, entity_id, metadata)
  values(new.id, requested_role, 'account.registered', 'profile', new.id::text, jsonb_build_object('email_verified', new.email_confirmed_at is not null));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email,''), updated_at = timezone('utc', now()) where id = new.id;
    insert into public.audit_log(actor_id, actor_role, action, entity_type, entity_id, metadata)
    select new.id, coalesce(p.role,'buyer'), 'account.email_changed', 'profile', new.id::text, '{}'::jsonb
    from public.profiles p where p.id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
after update of email on auth.users
for each row execute function public.handle_user_email_change();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.owns_vendor(target_vendor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.vendor_profiles where id = target_vendor and user_id = auth.uid());
$$;

create or replace function public.has_active_entitlement(target_product uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.entitlements
    where user_id = auth.uid() and product_id = target_product and status = 'active'
  );
$$;

create or replace function public.refresh_product_sales(target_product uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set sales_count = (
    select count(*)::int
    from public.order_items
    where product_id = target_product
      and status in ('paid','refund_requested','refund_declined')
  )
  where id = target_product;
$$;

create or replace function public.refresh_product_rating(target_product uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products p
  set rating_average = coalesce(x.avg_rating,0),
      review_count = coalesce(x.review_count,0)
  from (
    select product_id, round(avg(rating)::numeric,2) avg_rating, count(*)::int review_count
    from public.reviews
    where product_id = target_product and status = 'published'
    group by product_id
  ) x
  where p.id = target_product;

  if not found then
    update public.products set rating_average = 0, review_count = 0 where id = target_product;
  end if;
end;
$$;

create or replace function public.review_rating_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_product uuid;
begin
  target_product := case when tg_op = 'DELETE' then old.product_id else new.product_id end;
  perform public.refresh_product_rating(target_product);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.review_rating_trigger();

insert into public.marketplace_settings(id) values (1) on conflict (id) do nothing;

insert into public.categories(name, slug, description, icon, accent, sort_order, featured)
values
('Environments','environments','World kits, interiors and biomes','⌂','cyan',10,true),
('Props','props','Game-ready objects and set dressing','⬡','amber',20,true),
('Characters','characters','Heroes, NPCs, creatures and rigs','◉','magenta',30,true),
('Vehicles','vehicles','Ground, air and sci-fi vehicles','▰','blue',40,false),
('Weapons','weapons','FPS, melee and combat packs','⌁','cyan',50,true),
('Animations','animations','FPS, character and cinematic motion','◇','red',60,false),
('Materials & textures','materials-textures','PBR materials, decals and surfaces','▦','violet',70,false),
('Audio','audio','Music, ambience and sound effects','◖','magenta',80,false),
('Scripts & systems','scripts-systems','AI, inventory and gameplay systems','⚙','green',90,true),
('Shaders & VFX','shaders-vfx','Weather, particles and visual systems','✦','blue',100,true),
('UI & 2D','ui-2d','HUDs, menus, icons and interface kits','▤','violet',110,false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  accent = excluded.accent,
  sort_order = excluded.sort_order;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
('product-images','product-images',true,15728640,array['image/jpeg','image/png','image/webp','image/gif']),
('asset-packages','asset-packages',false,5368709120,null),
('avatars','avatars',true,5242880,array['image/jpeg','image/png','image/webp']),
('storefront-banners','storefront-banners',true,15728640,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.vendor_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_versions enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.entitlements enable row level security;
alter table public.reviews enable row level security;
alter table public.support_tickets enable row level security;
alter table public.refund_requests enable row level security;
alter table public.admin_cases enable row level security;
alter table public.payouts enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.marketplace_settings enable row level security;
alter table public.creator_follows enable row level security;
alter table public.favourites enable row level security;
alter table public.download_events enable row level security;

create policy profiles_select_own_or_admin on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own_or_admin on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy vendors_public_or_owner_admin on public.vendor_profiles for select using (status = 'approved' or user_id = auth.uid() or public.is_admin());
create policy vendors_owner_update on public.vendor_profiles for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy categories_public_read on public.categories for select using (visible or public.is_admin());
create policy categories_admin_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy products_public_owner_admin_read on public.products for select using (status = 'published' or public.owns_vendor(vendor_id) or public.is_admin());
create policy products_vendor_insert on public.products for insert with check (public.owns_vendor(vendor_id) or public.is_admin());
create policy products_vendor_update on public.products for update using (public.owns_vendor(vendor_id) or public.is_admin()) with check (public.owns_vendor(vendor_id) or public.is_admin());
create policy products_vendor_delete on public.products for delete using ((public.owns_vendor(vendor_id) and status = 'draft') or public.is_admin());

create policy product_images_read on public.product_images for select using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'published' or public.owns_vendor(p.vendor_id) or public.is_admin())));
create policy product_images_owner_write on public.product_images for all using (exists(select 1 from public.products p where p.id = product_id and (public.owns_vendor(p.vendor_id) or public.is_admin()))) with check (exists(select 1 from public.products p where p.id = product_id and (public.owns_vendor(p.vendor_id) or public.is_admin())));

create policy product_versions_authorised_read on public.product_versions for select using (
  exists(select 1 from public.products p where p.id = product_id and (public.owns_vendor(p.vendor_id) or public.is_admin()))
  or public.has_active_entitlement(product_id)
);
create policy product_versions_owner_write on public.product_versions for all using (exists(select 1 from public.products p where p.id = product_id and (public.owns_vendor(p.vendor_id) or public.is_admin()))) with check (exists(select 1 from public.products p where p.id = product_id and (public.owns_vendor(p.vendor_id) or public.is_admin())));

create policy orders_buyer_vendor_admin_read on public.orders for select using (
  user_id = auth.uid() or public.is_admin() or exists(
    select 1 from public.order_items oi where oi.order_id = id and public.owns_vendor(oi.vendor_id)
  )
);
create policy order_items_buyer_vendor_admin_read on public.order_items for select using (
  public.is_admin() or public.owns_vendor(vendor_id) or exists(select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

create policy entitlements_buyer_admin_read on public.entitlements for select using (user_id = auth.uid() or public.is_admin());

create policy reviews_public_read on public.reviews for select using (status = 'published' or user_id = auth.uid() or public.is_admin());
-- Review creation and editing are mediated by audited server endpoints so entitlement,
-- content and identity checks cannot be bypassed with a direct browser query.
create policy reviews_admin_write on public.reviews for all using (public.is_admin()) with check (public.is_admin());

create policy tickets_participant_read on public.support_tickets for select using (
  user_id = auth.uid() or public.is_admin() or (vendor_id is not null and public.owns_vendor(vendor_id))
);
-- Ticket writes are server-only; participants retain scoped read access.
create policy tickets_admin_write on public.support_tickets for all using (public.is_admin()) with check (public.is_admin());

create policy refunds_buyer_admin_read on public.refund_requests for select using (user_id = auth.uid() or public.is_admin());
-- Refund rows can only be created by the audited eligibility endpoint.
create policy refunds_admin_write on public.refund_requests for all using (public.is_admin()) with check (public.is_admin());

create policy admin_cases_admin_only on public.admin_cases for all using (public.is_admin()) with check (public.is_admin());
create policy payouts_vendor_admin_read on public.payouts for select using (public.owns_vendor(vendor_id) or public.is_admin());
create policy audit_admin_read on public.audit_log for select using (public.is_admin());

create policy notifications_own_read on public.notifications for select using (user_id = auth.uid() or public.is_admin());
create policy notifications_own_update on public.notifications for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy settings_public_read on public.marketplace_settings for select using (true);
create policy settings_admin_write on public.marketplace_settings for all using (public.is_admin()) with check (public.is_admin());

create policy creator_follows_public_read on public.creator_follows for select using (true);
create policy creator_follows_own_insert on public.creator_follows for insert with check (user_id = auth.uid());
create policy creator_follows_own_delete on public.creator_follows for delete using (user_id = auth.uid() or public.is_admin());
create policy favourites_own_all on public.favourites for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy downloads_own_read on public.download_events for select using (user_id = auth.uid() or public.is_admin());



-- Admins can perform every database operation. Application APIs still validate each action
-- and use the service role for transactional workflows, while these policies preserve the
-- explicit unrestricted administrator requirement for direct Supabase access.
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy vendors_admin_all on public.vendor_profiles for all using (public.is_admin()) with check (public.is_admin());
create policy orders_admin_all on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy order_items_admin_all on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy entitlements_admin_all on public.entitlements for all using (public.is_admin()) with check (public.is_admin());
create policy reviews_admin_all on public.reviews for all using (public.is_admin()) with check (public.is_admin());
create policy tickets_admin_all on public.support_tickets for all using (public.is_admin()) with check (public.is_admin());
create policy refunds_admin_all on public.refund_requests for all using (public.is_admin()) with check (public.is_admin());
create policy payouts_admin_all on public.payouts for all using (public.is_admin()) with check (public.is_admin());
create policy audit_admin_all on public.audit_log for all using (public.is_admin()) with check (public.is_admin());
create policy notifications_admin_all on public.notifications for all using (public.is_admin()) with check (public.is_admin());
create policy creator_follows_admin_all on public.creator_follows for all using (public.is_admin()) with check (public.is_admin());
create policy favourites_admin_all on public.favourites for all using (public.is_admin()) with check (public.is_admin());
create policy downloads_admin_all on public.download_events for all using (public.is_admin()) with check (public.is_admin());

create policy public_storage_read on storage.objects for select using (bucket_id in ('product-images','avatars','storefront-banners'));

-- RLS controls row ownership. These guards protect server-owned columns while
-- still allowing authenticated administrators unrestricted access through is_admin().
create or replace function public.is_privileged_writer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select current_user in ('postgres','service_role','supabase_admin')
    or coalesce(auth.role(),'') = 'service_role'
    or public.is_admin();
$$;

create or replace function public.protect_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i integer;
  column_name text;
begin
  if public.is_privileged_writer() then
    return new;
  end if;
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if tg_nargs > 0 then
    for i in 0..tg_nargs-1 loop
      column_name := tg_argv[i];
      if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
        raise exception 'Column % is server-controlled', column_name using errcode = '42501';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_product_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_writer() then return new; end if;
  if new.status <> 'draft' or new.moderation_notes <> '' or new.view_count <> 0
     or new.sales_count <> 0 or new.rating_average <> 0 or new.review_count <> 0
     or new.published_at is not null then
    raise exception 'Product moderation and aggregate fields are server-controlled' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_version_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_privileged_writer() then return new; end if;
  if new.status <> 'pending' or new.is_current or new.approved_at is not null or new.approved_by is not null then
    raise exception 'Version approval fields are server-controlled' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_server_columns on public.profiles;
create trigger profiles_protect_server_columns before update on public.profiles
for each row execute function public.protect_columns('role','email','created_at');

drop trigger if exists vendors_protect_server_columns on public.vendor_profiles;
create trigger vendors_protect_server_columns before update on public.vendor_profiles
for each row execute function public.protect_columns(
  'user_id','status','status_reason','stripe_account_id','stripe_charges_enabled',
  'stripe_payouts_enabled','stripe_details_submitted','commission_percent','payout_schedule',
  'approved_at','approved_by','created_at'
);

drop trigger if exists products_protect_server_columns on public.products;
create trigger products_protect_server_columns before update on public.products
for each row execute function public.protect_columns(
  'vendor_id','status','moderation_notes','view_count','sales_count','rating_average',
  'review_count','published_at','created_at'
);

drop trigger if exists products_enforce_insert_defaults on public.products;
create trigger products_enforce_insert_defaults before insert on public.products
for each row execute function public.enforce_product_insert_defaults();

drop trigger if exists product_images_protect_server_columns on public.product_images;
create trigger product_images_protect_server_columns before update on public.product_images
for each row execute function public.protect_columns('product_id','created_at');

drop trigger if exists product_versions_protect_server_columns on public.product_versions;
create trigger product_versions_protect_server_columns before update on public.product_versions
for each row execute function public.protect_columns('product_id','status','is_current','approved_at','approved_by','created_at');

drop trigger if exists product_versions_enforce_insert_defaults on public.product_versions;
create trigger product_versions_enforce_insert_defaults before insert on public.product_versions
for each row execute function public.enforce_version_insert_defaults();

drop trigger if exists notifications_protect_server_columns on public.notifications;
create trigger notifications_protect_server_columns before update on public.notifications
for each row execute function public.protect_columns('user_id','type','title','body','href','dedupe_key','created_at');

drop trigger if exists reviews_protect_server_columns on public.reviews;
create trigger reviews_protect_server_columns before update on public.reviews
for each row execute function public.protect_columns('user_id','product_id','order_item_id','status','vendor_response','created_at');

drop trigger if exists tickets_protect_server_columns on public.support_tickets;
create trigger tickets_protect_server_columns before update on public.support_tickets
for each row execute function public.protect_columns(
  'ticket_number','user_id','vendor_id','product_id','order_id','order_item_id',
  'status','priority','assigned_to','created_at'
);

-- These maintenance functions mutate aggregate state and are reserved for trusted
-- server workflows. RLS helper functions remain executable for policy evaluation.
revoke execute on function public.refresh_product_sales(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_product_rating(uuid) from public, anon, authenticated;
grant execute on function public.refresh_product_sales(uuid) to service_role;
grant execute on function public.refresh_product_rating(uuid) to service_role;

commit;
