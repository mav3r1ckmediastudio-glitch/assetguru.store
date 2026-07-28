import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');
const allowProduction = args.includes('--allow-production');
const valueArg = (name) => args.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);
const positional = args.find((arg) => !arg.startsWith('--'));
const outputPath = valueArg('--output') ?? 'catalogue-performance-report.json';

function normaliseBaseUrl(value) {
  if (!value) return '';
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('The staging URL must use http or https.');
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

const checks = [];
const warnings = [];
const timings = {};
const payloadBytes = {};
const assert = (condition, message) => {
  checks.push({ passed: Boolean(condition), message });
  if (!condition) throw new Error(message);
};

async function request(baseUrl, path, label, options = {}) {
  const started = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'follow',
    headers: {
      accept: options.accept ?? 'application/json',
      'user-agent': options.userAgent ?? 'AssetGuru-Catalogue-Audit/1.0'
    }
  });
  const text = await response.text();
  timings[label] = Math.round(performance.now() - started);
  payloadBytes[label] = Buffer.byteLength(text);
  return { response, text };
}

function parseJson(text, label) {
  try { return JSON.parse(text); }
  catch { throw new Error(`${label} did not return valid JSON.`); }
}

async function runAudit(baseUrl, { writeReport = true } = {}) {
  const first = await request(baseUrl, '/api/catalogue?page=1&pageSize=24&includeMeta=0&sort=trending', 'cataloguePage1');
  assert(first.response.ok, `Catalogue page 1 returned HTTP ${first.response.status}.`);
  const cacheHeader = first.response.headers.get('cache-control') ?? '';
  assert(cacheHeader.includes('s-maxage='), 'Catalogue response includes shared-cache control.');
  const page1 = parseJson(first.text, 'Catalogue page 1');
  assert(Array.isArray(page1.assets), 'Catalogue page 1 contains an assets array.');
  assert(page1.assets.length <= 24, 'Catalogue page 1 returns no more than 24 cards.');
  assert(page1.pagination?.page === 1, 'Catalogue page 1 reports the correct page number.');
  assert(page1.pagination?.pageSize === 24, 'Catalogue page 1 reports a 24-card page size.');
  assert(new Set(page1.assets.map((asset) => asset.slug)).size === page1.assets.length, 'Catalogue page 1 contains no duplicate slugs.');

  for (const asset of page1.assets) {
    if ('description' in asset) assert(asset.description === '', `Card ${asset.slug} does not contain a full description.`);
    for (const field of ['gallery', 'features', 'contents', 'recentReviews']) {
      if (field in asset) assert(Array.isArray(asset[field]) && asset[field].length === 0, `Card ${asset.slug} keeps ${field} lightweight.`);
    }
  }

  if (payloadBytes.cataloguePage1 > 300_000) warnings.push(`Catalogue page 1 payload is ${payloadBytes.cataloguePage1} bytes; review card payload size.`);
  if (timings.cataloguePage1 > 2_500) warnings.push(`Catalogue page 1 took ${timings.cataloguePage1} ms; this may include a cold start.`);

  if (page1.pagination?.hasMore) {
    const second = await request(baseUrl, '/api/catalogue?page=2&pageSize=24&includeMeta=0&sort=trending', 'cataloguePage2');
    assert(second.response.ok, `Catalogue page 2 returned HTTP ${second.response.status}.`);
    const page2 = parseJson(second.text, 'Catalogue page 2');
    assert(Array.isArray(page2.assets) && page2.assets.length <= 24, 'Catalogue page 2 returns no more than 24 cards.');
    const page1Slugs = new Set(page1.assets.map((asset) => asset.slug));
    assert(page2.assets.every((asset) => !page1Slugs.has(asset.slug)), 'Catalogue page 2 does not repeat page 1 slugs.');
  }

  const newest = await request(baseUrl, '/api/catalogue?page=1&pageSize=24&includeMeta=0&sort=newest', 'catalogueNewest');
  assert(newest.response.ok, `Newest-sort catalogue request returned HTTP ${newest.response.status}.`);
  const newestData = parseJson(newest.text, 'Newest-sort catalogue request');
  assert(Array.isArray(newestData.assets) && newestData.assets.length <= 24, 'Newest sort preserves server-side pagination.');

  const firstSlug = page1.assets[0]?.slug;
  if (firstSlug) {
    const detail = await request(baseUrl, `/api/catalogue/${encodeURIComponent(firstSlug)}`, 'singleProduct');
    assert(detail.response.ok, `Dedicated product endpoint returned HTTP ${detail.response.status}.`);
    const product = parseJson(detail.text, 'Dedicated product endpoint');
    assert(product.asset?.slug === firstSlug, 'Dedicated product endpoint returns the requested product.');
    assert(typeof product.asset?.description === 'string', 'Dedicated product endpoint includes the full description field.');
    assert(Array.isArray(product.asset?.gallery), 'Dedicated product endpoint includes the product gallery.');
    assert(product.creator && typeof product.creator === 'object', 'Dedicated product endpoint includes creator details.');
    assert(Array.isArray(product.related), 'Dedicated product endpoint includes related products.');
    if (payloadBytes.singleProduct > 700_000) warnings.push(`Single-product payload is ${payloadBytes.singleProduct} bytes; review gallery or review volume.`);
    if (timings.singleProduct > 3_000) warnings.push(`Single-product endpoint took ${timings.singleProduct} ms; this may include a cold start.`);
  } else {
    warnings.push('No catalogue assets were available, so the dedicated product endpoint could not be exercised.');
  }

  const desktop = await request(baseUrl, '/marketplace', 'desktopHtml', {
    accept: 'text/html',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/149 Safari/537.36'
  });
  assert(desktop.response.ok, `Desktop marketplace HTML returned HTTP ${desktop.response.status}.`);
  assert(desktop.text.toLowerCase().includes('<html'), 'Desktop marketplace returned HTML.');

  const mobile = await request(baseUrl, '/marketplace', 'mobileHtml', {
    accept: 'text/html',
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/149 Mobile Safari/537.36'
  });
  assert(mobile.response.ok, `Mobile marketplace HTML returned HTTP ${mobile.response.status}.`);
  assert(mobile.text.toLowerCase().includes('<html'), 'Mobile marketplace returned HTML.');

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    passed: true,
    checks,
    warnings,
    timingsMs: timings,
    payloadBytes
  };
  if (writeReport) await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

async function createSelfTestServer() {
  const assets = Array.from({ length: 48 }, (_, index) => ({
    slug: `self-test-${String(index + 1).padStart(3, '0')}`,
    title: `Self Test Asset ${index + 1}`,
    description: '', gallery: [], features: [], contents: [], recentReviews: []
  }));
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/api/catalogue') {
      const page = Math.max(1, Number(url.searchParams.get('page') ?? 1));
      const pageSize = 24;
      const start = (page - 1) * pageSize;
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=30, s-maxage=60, stale-while-revalidate=300' });
      response.end(JSON.stringify({ assets: assets.slice(start, start + pageSize), pagination: { page, pageSize, total: assets.length, totalPages: 2, hasMore: page < 2 }, stats: { totalAssets: assets.length, averageRating: 4.8 } }));
      return;
    }
    if (url.pathname.startsWith('/api/catalogue/')) {
      const slug = decodeURIComponent(url.pathname.split('/').pop() ?? '');
      response.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'public, max-age=30, s-maxage=60' });
      response.end(JSON.stringify({ asset: { slug, description: 'Full self-test description.', gallery: ['/image.webp'] }, creator: { name: 'Self Test Creator' }, related: [] }));
      return;
    }
    if (url.pathname === '/marketplace') {
      response.writeHead(200, { 'content-type': 'text/html' });
      response.end('<!doctype html><html><body>Marketplace self-test</body></html>');
      return;
    }
    response.writeHead(404).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start the self-test server.');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

try {
  if (selfTest) {
    const { server, baseUrl } = await createSelfTestServer();
    try {
      const report = await runAudit(baseUrl, { writeReport: false });
      console.log(`Catalogue staging-audit self-test passed: ${report.checks.length} checks.`);
    } finally {
      server.close();
    }
  } else {
    const baseUrl = normaliseBaseUrl(valueArg('--base-url') ?? positional ?? process.env.ASSETGURU_STAGING_URL ?? '');
    if (!baseUrl) throw new Error('Provide the Netlify staging URL as an argument or ASSETGURU_STAGING_URL environment variable.');
    if (!allowProduction && new URL(baseUrl).hostname === 'assetgurustore.netlify.app') {
      throw new Error('Production is blocked by default. Use the Netlify deploy-preview or branch-deploy URL for Step 3 testing.');
    }
    const report = await runAudit(baseUrl);
    console.log(`Catalogue staging audit passed: ${report.checks.length} checks, ${report.warnings.length} warning(s).`);
    console.log(`Report written to ${outputPath}`);
    for (const warning of report.warnings) console.warn(`WARNING: ${warning}`);
  }
} catch (error) {
  console.error(`Catalogue staging audit failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
