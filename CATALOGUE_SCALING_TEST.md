# Catalogue Scaling – Staging Test

1. Apply `supabase/migrations/202607280004_catalogue_scaling.sql` to staging.
2. Run `supabase/testing/generate_catalogue_performance_records.sql` on staging only.
3. Confirm `/marketplace` initially shows 24 cards and a **Load 24 more assets** button.
4. Test search, category, price, rating, compatibility, source-file and sort controls.
5. Open products from the first, middle and final result pages. Confirm full galleries, descriptions, versions and reviews load.
6. Test at desktop, 768 px and 390 px widths.
7. In browser developer tools, select **Fast 3G**, reload, and confirm cards appear in batches and images lazy-load while scrolling.
8. Confirm creator draft saving, R2 ZIP upload, moderation review, approval and secure download still pass unchanged.
9. Run `supabase/testing/cleanup_catalogue_performance_records.sql` when testing is complete.
