import { json } from '@sveltejs/kit';
import { z } from 'zod';
import { apiError, getSupabaseAdmin, requireRole, writeAudit } from '$lib/server/supabase';
import { createR2UploadUrl, r2StoredPath } from '$lib/server/r2';
import { taxonomyCategory } from '$lib/data/category-taxonomy';
import { parseShowcaseVideoUrl } from '$lib/showcase-video';

const MAX_R2_SINGLE_UPLOAD = 5 * 1024 ** 3;

const baseFile = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().min(1),
  type: z.string().max(120).default('application/octet-stream')
});
const packageFile = baseFile.refine(
  (file) => file.size <= MAX_R2_SINGLE_UPLOAD,
  'Asset packages cannot exceed the 5 GiB single-upload limit.'
);
const documentationFile = baseFile.refine(
  (file) => file.size <= 250 * 1024 ** 2,
  'Documentation cannot exceed 250 MB.'
);
const previewFile = baseFile
  .refine((file) => file.size <= 15 * 1024 ** 2, 'Preview images cannot exceed 15 MB.')
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type),
    'Preview files must be JPG, PNG, WebP or GIF.'
  );

const filesSchema = z.object({
  package: packageFile,
  documentation: documentationFile.optional(),
  previews: z.array(previewFile).min(3).max(12)
});

const schema = z.object({
  title: z.string().trim().min(1, 'Enter a product title before saving the draft.').max(120),
  summary: z.string().trim().max(300).default(''),
  description: z.string().trim().max(12000).default(''),
  category: z.string().trim().max(100).default(''),
  subcategory: z.string().trim().max(100).default(''),
  price: z.number().min(0).max(9999).default(0),
  extendedPrice: z.number().min(0).max(24999).default(0),
  version: z.string().trim().max(40).default('1.0.0'),
  compatibility: z.string().max(120).default('GameGuru MAX'),
  maxVersion: z.enum(['2024+', '2025+', '2026+', 'Any MAX build']).default('Any MAX build'),
  sourceFiles: z.boolean().default(false),
  dependencies: z.string().max(300).default('None'),
  performance: z.enum(['Lightweight', 'Mid-range', 'High detail']).default('Mid-range'),
  features: z.array(z.string().max(180)).max(50).default([]),
  contents: z.array(z.string().max(180)).max(100).default([]),
  tags: z.array(z.string().max(50)).max(30).default([]),
  formats: z.array(z.string().max(30)).max(30).default([]),
  licence: z.string().max(200).default('Standard commercial licence'),
  showcaseVideoUrl: z.string().trim().max(500).default(''),
  mode: z.enum(['draft', 'review']),
  files: filesSchema.optional()
});

const safe = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-150) || 'file';
const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function POST({ locals, request }: import('./$types').RequestEvent) {
  let createdProductId: string | undefined;

  try {
    const { user } = await requireRole(locals, ['vendor']);
    const body = schema.parse(await request.json());
    const showcaseVideo = body.showcaseVideoUrl ? parseShowcaseVideoUrl(body.showcaseVideoUrl) : null;
    if (body.showcaseVideoUrl && !showcaseVideo) {
      return json({ message: 'Use a valid YouTube or Vimeo video URL.' }, { status: 400 });
    }

    if (body.mode === 'review') {
      if (body.title.length < 5) return json({ message: 'Product titles must contain at least 5 characters.' }, { status: 400 });
      if (body.summary.length < 20) return json({ message: 'The short summary must contain at least 20 characters.' }, { status: 400 });
      if (body.description.length < 60) return json({ message: 'The full description must contain at least 60 characters.' }, { status: 400 });
      if (!body.category || !body.subcategory) return json({ message: 'Choose a category and subcategory.' }, { status: 400 });
      if (!body.files) return json({ message: 'Choose the package, documentation and at least three preview images.' }, { status: 400 });
      if (!body.files.documentation) return json({ message: 'Attach installation documentation before submitting for review.' }, { status: 400 });
      if (!body.version) return json({ message: 'Enter a release version.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const [{ data: vendor }, { data: settings }] = await Promise.all([
      admin.from('vendor_profiles').select('*').eq('user_id', user.id).single(),
      admin.from('marketplace_settings').select('*').eq('id', 1).single()
    ]);

    if (!vendor || vendor.status !== 'approved') {
      return json({ message: 'Your creator account must be approved before creating products.' }, { status: 403 });
    }
    if (settings?.maintenance_mode) {
      return json({ message: 'Vendor uploads are paused during maintenance.' }, { status: 503 });
    }

    const pricePence = Math.round(body.price * 100);
    const requestedExtendedPence = Math.round(body.extendedPrice * 100);
    const extendedPence = Math.max(pricePence, requestedExtendedPence);

    if (body.mode === 'review') {
      if (pricePence === 0 && !settings?.allow_free_assets) {
        return json({ message: 'Free assets are currently disabled.' }, { status: 400 });
      }
      if (pricePence > 0 && pricePence < Number(settings?.minimum_price_pence ?? 0)) {
        return json(
          { message: `The minimum product price is £${(Number(settings?.minimum_price_pence ?? 0) / 100).toFixed(2)}.` },
          { status: 400 }
        );
      }
      if (requestedExtendedPence < pricePence) {
        return json({ message: 'Extended licence price cannot be below the standard price.' }, { status: 400 });
      }
    }

    let category: { id: string; name: string } | null = null;
    if (body.category) {
      const categoryQuery = admin.from('categories').select('id,name');
      const result = await (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(body.category)
        ? categoryQuery.eq('id', body.category).maybeSingle()
        : categoryQuery.eq('name', body.category).maybeSingle());
      category = result.data;
      if (!category) return json({ message: 'Choose a valid category.' }, { status: 400 });

      if (body.subcategory) {
        const taxonomy = taxonomyCategory(category.name);
        if (!taxonomy || !taxonomy.subcategories.includes(body.subcategory)) {
          return json({ message: 'Choose a valid subcategory for the selected category.' }, { status: 400 });
        }
      } else if (body.mode === 'review') {
        return json({ message: 'Choose a subcategory.' }, { status: 400 });
      }
    }

    let slug = slugify(body.title);
    const { data: existing } = await admin.from('products').select('id').eq('slug', slug).maybeSingle();
    if (existing) slug = `${slug}-${crypto.randomUUID().slice(0, 6)}`;

    const { data: product, error: productError } = await admin
      .from('products')
      .insert({
        vendor_id: vendor.id,
        category_id: category?.id ?? null,
        slug,
        title: body.title,
        subcategory: body.subcategory,
        summary: body.summary,
        description: body.description,
        price_pence: pricePence,
        extended_price_pence: extendedPence,
        status: 'draft',
        compatibility: body.compatibility,
        max_version: body.maxVersion,
        source_files: body.sourceFiles,
        dependencies: body.dependencies,
        performance: body.performance,
        features: body.features,
        contents: body.contents,
        tags: body.tags,
        formats: body.formats,
        licence: body.licence,
        ...(showcaseVideo ? { showcase_video_url: showcaseVideo.canonicalUrl } : {})
      })
      .select('*')
      .single();

    if (productError) throw productError;
    createdProductId = product.id;

    const baseProduct = {
      id: product.id,
      slug,
      title: product.title,
      image: '/images/marketplace-grid.webp',
      images: [],
      category: category?.name ?? 'Uncategorised',
      subcategory: body.subcategory,
      status: 'Draft',
      price: body.price,
      extendedPrice: extendedPence / 100,
      sales: 0,
      revenue: 0,
      views: 0,
      conversion: 0,
      rating: 0,
      reviews: 0,
      version: body.version || '1.0.0',
      updated: 'Just now',
      summary: body.summary,
      description: body.description,
      compatibility: body.compatibility,
      maxVersion: body.maxVersion,
      sourceFiles: body.sourceFiles,
      dependencies: body.dependencies,
      performance: body.performance,
      features: body.features,
      contents: body.contents,
      tags: body.tags,
      formats: body.formats,
      licence: body.licence,
      showcaseVideoUrl: showcaseVideo?.canonicalUrl,
      versions: []
    };

    if (body.mode === 'draft') {
      await writeAudit({
        actorId: user.id,
        actorRole: 'vendor',
        action: 'product.draft_created',
        entityType: 'product',
        entityId: product.id,
        metadata: { slug, metadataOnly: true },
        request
      });
      createdProductId = undefined;
      return json({ product: baseProduct, uploads: [], mode: body.mode });
    }

    const files = body.files!;
    const root = `${vendor.id}/${product.id}/${safe(body.version)}`;
    const packageKey = `${root}/package/${crypto.randomUUID()}-${safe(files.package.name)}`;
    const docsKey = `${root}/documentation/${crypto.randomUUID()}-${safe(files.documentation!.name)}`;
    const packagePath = r2StoredPath(packageKey);
    const docsPath = r2StoredPath(docsKey);

    const { data: version, error: versionError } = await admin
      .from('product_versions')
      .insert({
        product_id: product.id,
        version: body.version,
        package_path: packagePath,
        documentation_path: docsPath,
        file_size_bytes: files.package.size,
        status: 'pending',
        is_current: false,
        release_notes: 'Initial release'
      })
      .select('*')
      .single();
    if (versionError) throw versionError;

    const previewRows = files.previews.map((preview, index) => ({
      product_id: product.id,
      storage_path: `${root}/images/${String(index + 1).padStart(2, '0')}-${crypto.randomUUID()}-${safe(preview.name)}`,
      alt_text: `${body.title} preview ${index + 1}`,
      image_type: index === 0 ? 'cover' : 'gallery',
      sort_order: index
    }));
    const { data: images, error: imageError } = await admin.from('product_images').insert(previewRows).select('*');
    if (imageError) throw imageError;

    const uploads: Array<Record<string, unknown>> = [
      {
        provider: 'r2',
        url: await createR2UploadUrl(packageKey, files.package.type),
        path: packagePath,
        role: 'package',
        name: files.package.name,
        type: files.package.type,
        size: files.package.size
      },
      {
        provider: 'r2',
        url: await createR2UploadUrl(docsKey, files.documentation!.type),
        path: docsPath,
        role: 'documentation',
        name: files.documentation!.name,
        type: files.documentation!.type,
        size: files.documentation!.size
      }
    ];

    for (const [index, image] of (images ?? []).entries()) {
      const preview = files.previews[index];
      const { data, error } = await admin.storage
        .from('product-images')
        .createSignedUploadUrl(image.storage_path, { upsert: false });
      if (error || !data) throw error ?? new Error('SIGNED_UPLOAD_FAILED');
      uploads.push({
        provider: 'supabase',
        bucket: 'product-images',
        path: image.storage_path,
        token: data.token,
        role: `preview-${index}`,
        name: preview.name,
        type: preview.type,
        size: preview.size
      });
    }

    await writeAudit({
      actorId: user.id,
      actorRole: 'vendor',
      action: 'product.draft_created',
      entityType: 'product',
      entityId: product.id,
      metadata: { slug, version: body.version, mode: body.mode, packageStorage: 'r2' },
      request
    });

    createdProductId = undefined;
    return json({
      product: {
        ...baseProduct,
        currentVersionId: version.id,
        versions: [
          {
            id: version.id,
            version: body.version,
            status: 'pending',
            isCurrent: false,
            size: `${Math.round(files.package.size / 1024 / 1024)} MB`,
            created: 'Just now',
            releaseNotes: 'Initial release'
          }
        ]
      },
      uploads,
      mode: body.mode
    });
  } catch (error) {
    console.error(error);
    if (createdProductId) await getSupabaseAdmin().from('products').delete().eq('id', createdProductId);
    const e = apiError(error);
    return json(
      {
        message:
          error instanceof z.ZodError
            ? (error.issues[0]?.message ?? 'Complete every required product field.')
            : e.message
      },
      { status: error instanceof z.ZodError ? 400 : e.status }
    );
  }
}
