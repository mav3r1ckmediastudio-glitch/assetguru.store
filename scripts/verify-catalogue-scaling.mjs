import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];
const assert = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
};
const read = (path) => readFile(join(root, path), 'utf8');

const requiredFiles = [
  'src/routes/api/catalogue/+server.ts',
  'src/routes/api/catalogue/[slug]/+server.ts',
  'src/routes/marketplace/+page.svelte',
  'src/lib/components/AssetCard.svelte',
  'src/lib/server/loaders.ts',
  'src/lib/server/vendor-loaders.ts',
  'src/routes/api/vendor/products/+server.ts',
  'src/routes/api/vendor/orders/+server.ts',
  'src/routes/api/vendor/analytics/+server.ts',
  'src/routes/api/vendor/dashboard/+server.ts',
  'src/routes/api/vendor/payouts/+server.ts',
  'supabase/migrations/202607280004_catalogue_scaling.sql',
  'supabase/testing/generate_catalogue_performance_records.sql',
  'supabase/testing/cleanup_catalogue_performance_records.sql',
  'supabase/testing/verify_catalogue_performance_records.sql'
];

for (const file of requiredFiles) {
  try {
    const info = await stat(join(root, file));
    assert(info.isFile() && info.size > 0, `${file} exists and is not empty`);
  } catch {
    assert(false, `${file} exists and is not empty`);
  }
}

const [packageJson, catalogueApi, productApi, marketplace, assetCard, loaders, vendorLoaders, vendorProductsApi, vendorOrdersApi, migration, fixtures, r2Storage, envExample, r2Health] = await Promise.all([
  read('package.json'),
  read('src/routes/api/catalogue/+server.ts'),
  read('src/routes/api/catalogue/[slug]/+server.ts'),
  read('src/routes/marketplace/+page.svelte'),
  read('src/lib/components/AssetCard.svelte'),
  read('src/lib/server/loaders.ts'),
  read('src/lib/server/vendor-loaders.ts'),
  read('src/routes/api/vendor/products/+server.ts'),
  read('src/routes/api/vendor/orders/+server.ts'),
  read('supabase/migrations/202607280004_catalogue_scaling.sql'),
  read('supabase/testing/generate_catalogue_performance_records.sql'),
  read('src/lib/server/r2-storage.ts'),
  read('.env.example'),
  read('src/lib/server/r2-health.ts')
]);

const pkg = JSON.parse(packageJson);
assert(pkg.scripts?.['verify:catalogue'] === 'node scripts/verify-catalogue-scaling.mjs', 'package.json exposes verify:catalogue');
assert(pkg.scripts?.['test:catalogue:self'] === 'node scripts/catalogue-staging-smoke.mjs --self-test', 'package.json exposes the offline staging-audit self-test');
assert(pkg.scripts?.['test:catalogue:staging'] === 'node scripts/catalogue-staging-smoke.mjs', 'package.json exposes the staging smoke test');

assert(catalogueApi.includes("pageSize:Number(url.searchParams.get('pageSize')??24)"), 'public catalogue defaults to 24 cards');
assert(catalogueApi.includes("s-maxage=60"), 'public catalogue has short-lived shared caching');
assert(productApi.includes('loadPublicProduct'), 'single-product API uses the dedicated loader');
assert(productApi.includes('stale-while-revalidate=300'), 'single-product API has short-lived shared caching');

const cardSelect = loaders.match(/const catalogueCardSelect=`([\s\S]*?)`;/)?.[1] ?? '';
assert(cardSelect.length > 0, 'lightweight catalogue-card select is present');
assert(!/\bdescription\b/.test(cardSelect), 'catalogue-card query excludes full descriptions');
assert(!/\bfeatures\b|\bcontents\b|\blicence\b|\breviews\s*:/.test(cardSelect), 'catalogue-card query excludes heavy product detail fields');
assert(loaders.includes('Math.min(100'), 'public page size is capped server-side');

assert(marketplace.includes("pageSize:'24'"), 'marketplace requests 24 cards per page');
assert(marketplace.includes('Load 24 more assets'), 'marketplace exposes Load More pagination');
assert(marketplace.includes('requestGeneration'), 'marketplace ignores stale catalogue responses');
assert(assetCard.includes('loading="lazy"'), 'marketplace card images are lazy-loaded');
assert(assetCard.includes('decoding="async"'), 'marketplace card images decode asynchronously');

const vendorProductDefinitions = [...vendorLoaders.matchAll(/export\s+async\s+function\s+loadVendorProducts\s*\(/g)].length;
assert(vendorProductDefinitions === 1, 'seller product loader has exactly one implementation');
assert(vendorLoaders.includes('requestedPageSize=Number(options.pageSize??24)'), 'seller Products defaults to 24 records');
assert(vendorLoaders.includes('loadVendorOrders(supabase:SupabaseClient<any>,userId:string,page=1,pageSize=25)'), 'seller Orders defaults to 25 records');
assert(vendorProductsApi.includes("pageSize:Number(url.searchParams.get('pageSize')??24)"), 'seller Products API forwards pagination');
assert(vendorOrdersApi.includes("pageSize')??25"), 'seller Orders API forwards pagination');

for (const name of [
  'idx_products_published_trending',
  'idx_products_published_rating',
  'idx_products_published_price',
  'idx_products_published_category',
  'idx_products_published_vendor',
  'idx_product_images_cover_order',
  'idx_product_versions_current_approved'
]) assert(migration.includes(name), `database migration includes ${name}`);

assert(fixtures.includes('for i in 1..120 loop'), 'staging fixture generator creates 120 records');
assert(fixtures.includes("'perf-test-'"), 'staging fixtures use deterministic perf-test slugs');
assert(fixtures.includes('sample_image_path'), 'staging fixtures reuse an existing safe preview image when available');

assert(r2Storage.includes("required('R2_ENDPOINT')"), 'R2 storage continues to read its endpoint from protected environment configuration');
assert(r2Health.includes(".r2.cloudflarestorage.com"), 'R2 health check validates Cloudflare endpoint hostnames');
assert(envExample.includes('https://YOUR_CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com'), 'environment example uses the non-regional Cloudflare R2 endpoint format');
assert(!envExample.includes('.eu.r2.cloudflarestorage.com'), 'incorrect .eu R2 endpoint example is absent');

const failed = checks.filter((check) => !check.condition);
if (failed.length) {
  console.error('Catalogue scaling verification failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}

console.log(`Catalogue scaling verification passed: ${checks.length} pagination, payload, cache, image, seller and database checks.`);
