import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const checks = [];
const assert = (condition, message) => checks.push({ condition, message });

const buyer = read('src/lib/stores/buyer.ts');
assert(buyer.includes('export type BuyerAvailableUpdate'), 'Buyer update result has an explicit asset-bearing type');
assert(buyer.includes('updates.push({ ...entry, latestVersion: asset.version, asset })'), 'Available updates include the resolved asset');
assert(buyer.includes('pending.push({ ...entry, asset })'), 'Pending reviews include the resolved asset');

const follows = read('src/routes/api/creator-follows/[slug]/+server.ts');
assert(!follows.includes('locals.user'), 'Creator follows no longer reads undeclared locals.user');
assert(!follows.includes('locals.profile'), 'Creator follows no longer reads undeclared locals.profile');
assert(follows.includes('await locals.safeGetSession()'), 'Creator follow GET uses the authenticated Supabase session');
assert(follows.includes('await requireUser(locals)'), 'Creator follow mutations require an authenticated user');

for (const path of [
  'src/routes/api/vendor/media/+server.ts',
  'src/routes/api/vendor/products/[slug]/+server.ts',
  'src/routes/api/vendor/products/[slug]/complete/+server.ts',
  'src/routes/api/vendor/products/[slug]/versions/+server.ts',
  'src/routes/api/vendor/storefront/+server.ts'
]) {
  const source = read(path);
  assert(source.includes('Vendor profile not found.'), `${path} guards a missing vendor profile`);
}

const logout = read('src/routes/auth/logout/+server.ts');
assert(logout.includes('Promise<never>'), 'Logout handler declares the redirecting return type');
assert(logout.includes("return redirect(303, '/')"), 'Logout returns the redirect response');

const cases = read('src/routes/api/admin/cases/[id]/+server.ts');
assert(cases.includes('const notices: CaseNotice[] = []'), 'Admin case notifications exclude nulls by construction');
assert(!cases.includes('.filter(Boolean)'), 'Admin case notifications no longer rely on unsafe Boolean filtering');

const failed = checks.filter((check) => !check.condition);
if (failed.length) {
  console.error('Known-error verification failed:');
  for (const check of failed) console.error(`- ${check.message}`);
  process.exit(1);
}
console.log(`Known-error verification passed: ${checks.length} focused checks.`);
