# Sprint 6 Acceptance Test

Use a fresh Supabase project, Stripe test mode and three email addresses: admin, vendor and buyer.

## Preflight

```bash
npm install
npm run verify
npm run check
npm run build
```

Confirm the marketplace loads with zero products and no placeholder sales, reviews, orders or earnings.

## Complete workflow

1. **Buyer registration** — register, receive verification email, verify, log in, request a password reset and complete it.
2. **Vendor registration** — register with the vendor role and confirm a pending vendor application appears for admin.
3. **Admin approval** — promote the owner account to admin and approve the vendor. Confirm an audit record and vendor notification.
4. **Stripe Connect** — start onboarding from Creator Hub, complete test onboarding and confirm payouts become enabled after `account.updated`.
5. **Asset upload** — create a listing, upload valid previews and a package through signed URLs, and submit for review.
6. **Moderation** — request changes once, resubmit, then approve. Confirm only the approved version is public.
7. **Purchase** — buyer adds the product, chooses a licence and completes Stripe Checkout with a test card.
8. **Webhook fulfilment** — confirm the order is paid, order items are paid, the entitlement exists and the buyer receives a notification.
9. **Secure download** — open Library, request a download, confirm a short-lived signed URL is returned and a download event is stored. Test another account and confirm access is denied.
10. **Vendor earnings** — confirm commission, vendor net amount, Stripe transfer ID and payout record match the order.
11. **Refund** — buyer submits a valid refund request; admin resolves it. Confirm Stripe refund, transfer reversal, revoked entitlement, reversed payout and corrected sales count.
12. **Audit log** — confirm registration, approval, onboarding-sensitive actions, product changes, moderation, purchase, download and refund actions are recorded.

## Negative tests

- Buyer attempts another buyer’s library or order URL.
- Vendor attempts to edit another vendor’s product slug.
- Unapproved vendor attempts an upload.
- Approved vendor without completed Stripe onboarding attempts an upload.
- Buyer edits basket request price in browser tools.
- Buyer attempts to download a retired/unowned product.
- Duplicate webhook delivery does not create duplicate entitlements, transfers or notifications.
- Refund is rejected outside the configured refund window.
- Product cannot be published without a completed package upload.
- Draft deletion removes associated Storage objects.

## Evidence to retain

Keep screenshots or exported records for Stripe events, Connect account state, order/entitlement rows, payout/transfer IDs, refund/reversal IDs, RLS-denied requests and the audit log. Do not include secret keys in test evidence.
