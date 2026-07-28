# AssetGuru Catalogue Scaling — Step 2 Test Notes

## Purpose

This step separates the creator workspace into small, purpose-built requests so that opening one seller screen no longer downloads every product, order, payout, review, image and version at once.

## Included changes

- Creator shell/profile request contains only profile, storefront and product counts.
- Products loads 24 records at a time and supports server-side search, status filtering and sorting.
- Revenue sorting is calculated across the matching seller catalogue before pagination.
- Individual product editing loads one complete seller product by slug.
- Orders load 25 records at a time with Load More.
- Analytics loads independently from product management and preserves lifetime seller totals.
- Payouts load independently from product management.
- Dashboard loads only the compact product, order, payout, chart and review data it displays.
- Product-card images use lazy loading and compact transformed URLs.
- Concurrent creator requests ignore stale responses after filters, account changes or navigation.

## Protected workflows

This step does not change:

- Cloudflare R2 configuration or endpoint.
- Package upload, verification or secure download logic.
- Preview-image upload logic.
- Admin moderation routes or moderation workspace.
- Public catalogue code completed in Step 1.

## Automated gate

The installer must pass all of the following before creating its local commit:

1. `git apply --check`
2. `git diff --check`
3. `npm run check`
4. `npm run build`

## Manual checks for the staging test step

- Products initially shows at most 24 rows/cards and Load More retrieves the next page.
- Search, status and sort changes replace the current result set rather than mixing old and new results.
- “Needs attention” includes both changes-requested and rejected listings.
- Opening a product still restores its complete description, media, package/version state and local unsaved editor draft.
- Orders initially shows at most 25 items and Load More works.
- Dashboard retains lifetime totals and displays recent buyer reviews.
- Analytics totals include historic sales from products that are no longer published.
- Storefront featured-product selection still lists all published seller products.
- New draft creation, reopening, package upload and moderation submission continue to work unchanged.
