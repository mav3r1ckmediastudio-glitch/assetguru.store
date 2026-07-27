-- AssetGuru optional product showcase video
-- Stores a canonical YouTube or Vimeo URL. The application validates and embeds it safely.

alter table public.products
  add column if not exists showcase_video_url text;

comment on column public.products.showcase_video_url is
  'Optional canonical YouTube or Vimeo showcase URL validated by AssetGuru.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_showcase_video_url_length'
  ) then
    alter table public.products
      add constraint products_showcase_video_url_length
      check (showcase_video_url is null or char_length(showcase_video_url) <= 500);
  end if;
end
$$;
