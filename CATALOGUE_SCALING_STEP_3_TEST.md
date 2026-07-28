# AssetGuru Catalogue Scaling — Step 3 Performance Test Harness

## Purpose

Step 3 adds repeatable evidence for the catalogue-scaling work without changing the creator upload, Cloudflare R2 or moderation workflows.

## Automated source gate

Run:

```bat
npm run verify:catalogue
npm run test:catalogue:self
```

The first command confirms the public 24-card query, dedicated product endpoint, cache headers, lazy images, seller pagination, database indexes, staging fixtures and the protected R2 endpoint. The second runs the full staging-audit logic against a local mock server so the audit script itself is tested before it is used against Netlify.

## Staging data

Apply these files to the staging Supabase project only, in this order:

1. `supabase/migrations/202607280004_catalogue_scaling.sql`
2. `supabase/testing/generate_catalogue_performance_records.sql`
3. `supabase/testing/verify_catalogue_performance_records.sql`

The generator creates 120 published records with deterministic `perf-test-` slugs. When an existing staging preview image is available, the fixtures reuse its storage path so lazy image loading and transformed thumbnail delivery can be exercised without uploading 120 duplicate files.

Expected verification result:

- 120 generated products.
- 120 published products.
- 120 current approved versions.
- More than one covered category when the staging catalogue contains multiple visible categories.
- Cover images may be zero only when staging had no existing product image to reuse.

## Automated Netlify staging audit

From Windows Command Prompt, replace the example URL with the Netlify deploy-preview or branch-deploy URL:

```bat
npm run test:catalogue:staging -- https://deploy-preview-example.netlify.app
```

The audit checks:

- Page 1 and page 2 return no more than 24 cards.
- Pages do not repeat product slugs.
- Card responses contain no full descriptions, galleries, features, contents or reviews.
- Public catalogue caching is present.
- Sorting retains pagination.
- A product opens through the dedicated product endpoint with full details.
- Desktop and mobile user-agent requests both return the marketplace successfully.
- Response timings and payload sizes are written to `catalogue-performance-report.json`.

The audit blocks `https://assetgurustore.netlify.app` by default so synthetic staging checks are not accidentally aimed at production.

## Browser checks

Use Microsoft Edge DevTools on the staging URL.

### Desktop

1. Set the viewport to 1440 × 900.
2. Open Marketplace and confirm exactly 24 cards initially.
3. Press **Load 24 more assets** and confirm the count rises without duplicates.
4. Change search, category, price, rating and sort filters and confirm the old result set is replaced.
5. Open products from the first and later pages and confirm full descriptions, images, versions and reviews display.

### Mobile

1. Toggle device emulation and select a 390 × 844 viewport.
2. Confirm cards form one column, filters open and close, and no horizontal page overflow appears.
3. Load more results twice and confirm the page remains responsive.
4. Open a product and return to the catalogue without a broken layout.

### Slower network

1. Open DevTools **Network**.
2. Select **Fast 3G** and disable cache.
3. Reload Marketplace.
4. Confirm the initial page remains limited to 24 cards.
5. Scroll slowly and confirm off-screen images load only as they approach the viewport.
6. Press **Load 24 more assets** and confirm the existing cards remain visible while the next page loads.
7. Repeat once with **Slow 4G** and record any visible failure in the performance report notes.

## Protected workflow regression

Before release, verify on staging:

- Existing creator drafts reopen.
- A new draft saves without Stripe.
- Preview images upload and persist.
- A normal ZIP uploads to the correct private R2 endpoint.
- Submission reaches moderation.
- Admin review, package verification and secure download still work.
- Approving the test listing publishes it correctly.

## Cleanup

After all tests pass, run:

`supabase/testing/cleanup_catalogue_performance_records.sql`

Then rerun the verification SQL and confirm all generated counts are zero.
