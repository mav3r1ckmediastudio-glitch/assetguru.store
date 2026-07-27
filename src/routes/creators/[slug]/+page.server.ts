import type { PageServerLoad } from './$types';
import type { Asset, Creator } from '$lib/data/marketplace';
import { getSupabaseAdmin } from '$lib/server/supabase';

const dateLong = (value?: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'long', year:'numeric' }).format(new Date(value))
  : '';

const pounds = (pence?: number | null) => Number(((pence ?? 0) / 100).toFixed(2));

const bytes = (size?: number | null) => {
  const value = Number(size ?? 0);
  if (!value) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index > 2 ? 1 : 0)} ${units[index]}`;
};

function publicUrl(supabase: ReturnType<typeof getSupabaseAdmin>, bucket:string, path?:string|null, fallback='') {
  if (!path) return fallback;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export const load: PageServerLoad = async ({ params }) => {
  try {
    const supabase = getSupabaseAdmin();
    const { data:vendor, error:vendorError } = await supabase
      .from('vendor_profiles')
      .select('id,slug,display_name,tagline,bio,response_time,location,specialties,avatar_path,banner_path,created_at,status,support_promise,update_commitment,custom_licence_notes,show_sales,show_followers')
      .eq('slug', params.slug)
      .eq('status', 'approved')
      .maybeSingle();

    if (vendorError) {
      console.error('Public creator lookup failed', vendorError);
      return { slug:params.slug, creator:null, creatorAssets:[], loadError:true };
    }

    if (!vendor) {
      return { slug:params.slug, creator:null, creatorAssets:[], loadError:false };
    }

    const [productsResult, followersResult] = await Promise.all([
      supabase
        .from('products')
        .select('id,slug,title,subcategory,summary,description,price_pence,extended_price_pence,badge,compatibility,max_version,source_files,dependencies,download_size_bytes,performance,features,contents,tags,formats,licence,sales_count,rating_average,review_count,updated_at,category:categories(name,accent),images:product_images(storage_path,image_type,sort_order),versions:product_versions(id,version,file_size_bytes,is_current,status)')
        .eq('vendor_id', vendor.id)
        .eq('status', 'published')
        .order('published_at', { ascending:false }),
      supabase
        .from('creator_follows')
        .select('vendor_id', { count:'exact', head:true })
        .eq('vendor_id', vendor.id)
    ]);

    if (productsResult.error) console.error('Public creator products failed', productsResult.error);
    if (followersResult.error) console.error('Public creator follower count failed', followersResult.error);

    const productRows = (productsResult.data ?? []) as any[];
    const avatar = publicUrl(supabase, 'avatars', vendor.avatar_path, '/favicon.svg');
    const banner = publicUrl(supabase, 'storefront-banners', vendor.banner_path, '/images/hero-city.webp');

    const creatorAssets:Asset[] = productRows.map((row:any) => {
      const images = [...(row.images ?? [])].sort((a:any,b:any) => Number(a.sort_order) - Number(b.sort_order));
      const cover = images.find((image:any) => image.image_type === 'cover') ?? images[0];
      const gallery = images.map((image:any) => publicUrl(supabase, 'product-images', image.storage_path)).filter(Boolean);
      const version = (row.versions ?? []).find((item:any) => item.is_current && item.status === 'approved')
        ?? (row.versions ?? []).find((item:any) => item.status === 'approved');
      const image = publicUrl(supabase, 'product-images', cover?.storage_path, '/images/marketplace-grid.webp');

      return {
        id:row.id,
        currentVersionId:version?.id,
        slug:row.slug,
        title:row.title,
        category:row.category?.name ?? 'Uncategorised',
        subcategory:row.subcategory ?? '',
        creator:vendor.display_name,
        creatorSlug:vendor.slug,
        creatorAvatar:avatar,
        image,
        gallery:gallery.length ? gallery : [image],
        price:pounds(row.price_pence),
        extendedPrice:row.extended_price_pence == null ? undefined : pounds(row.extended_price_pence),
        rating:Number(row.rating_average ?? 0),
        reviews:Number(row.review_count ?? 0),
        sales:Number(row.sales_count ?? 0),
        badge:row.badge ?? (row.price_pence === 0 ? 'Free' : undefined),
        accent:(row.category?.accent ?? 'cyan') as Asset['accent'],
        compatibility:row.compatibility ?? 'GameGuru MAX',
        maxVersion:(row.max_version ?? 'Any MAX build') as Asset['maxVersion'],
        sourceFiles:Boolean(row.source_files),
        dependencies:row.dependencies ?? 'None',
        downloadSize:bytes(version?.file_size_bytes ?? row.download_size_bytes),
        performance:(row.performance ?? 'Mid-range') as Asset['performance'],
        updated:dateLong(row.updated_at),
        version:version?.version ?? '1.0.0',
        summary:row.summary ?? '',
        description:row.description ?? '',
        features:row.features ?? [],
        contents:row.contents ?? [],
        tags:row.tags ?? [],
        formats:row.formats ?? [],
        licence:row.licence ?? 'Standard commercial licence',
        recentReviews:[]
      };
    });

    const reviewTotal = creatorAssets.reduce((sum, asset) => sum + asset.reviews, 0);
    const creator:Creator = {
      id:vendor.id,
      slug:vendor.slug,
      name:vendor.display_name,
      avatar,
      banner,
      tagline:vendor.tagline ?? '',
      bio:vendor.bio ?? '',
      rating:reviewTotal
        ? Number((creatorAssets.reduce((sum, asset) => sum + asset.rating * asset.reviews, 0) / reviewTotal).toFixed(1))
        : 0,
      reviews:reviewTotal,
      sales:creatorAssets.reduce((sum, asset) => sum + asset.sales, 0),
      followers:followersResult.count ?? 0,
      joined:dateLong(vendor.created_at),
      responseTime:vendor.response_time ?? 'Within 2 business days',
      location:vendor.location ?? '',
      specialties:vendor.specialties ?? [],
      verified:true,
      recentReviews:[],
      supportPromise:vendor.support_promise ?? '',
      updateCommitment:vendor.update_commitment ?? '',
      licenceNotes:vendor.custom_licence_notes ?? ''
    };

    return { slug:params.slug, creator, creatorAssets, loadError:false };
  } catch (error) {
    console.error('Public creator storefront failed', error);
    return { slug:params.slug, creator:null, creatorAssets:[], loadError:true };
  }
};
