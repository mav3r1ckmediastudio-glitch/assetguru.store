# Security Model

## Row Level Security

RLS is enabled on application tables. Policies are designed around `auth.uid()` and the role stored in `profiles`.

- Buyers can read and update their own profile and read only their own orders, entitlements, support, reviews, favourites, downloads and notifications.
- Vendors can manage only records belonging to their own `vendor_profiles.id`.
- Public catalogue policies expose only published products, approved current versions, visible categories and approved vendor storefronts.
- Admin policies permit operational access across protected tables.

Server endpoints still perform role and ownership checks before privileged actions. RLS is the second boundary, not a replacement for API validation.

## Privileged keys

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is used only in server modules. `STRIPE_SECRET_KEY` and the webhook signing secret are also server-only. They must never be imported from `$env/dynamic/public`, returned to the client or committed to source control.

## Storage

- `asset-packages` is private.
- Package downloads require a current active entitlement and an approved product version.
- Download URLs expire after five minutes.
- Product images, avatars and storefront banners are public presentation assets.
- Uploads are initiated by an authorised API and completed directly with short-lived signed upload tokens.
- The API validates file metadata and verifies required objects exist before moderation submission.

## Payments

- Product price, vendor, approved version and commission are loaded from the database on the server.
- Stripe webhook signatures are verified against the raw request body.
- Webhook fulfilment and transfers use stable idempotency keys.
- Entitlements are created only after successful payment events.
- Refunds revoke entitlements and reverse transfers.

## Audit

State-changing operations record actor, role, action, entity, metadata, IP address and user agent where available. Audit records should be retained according to the marketplace privacy and accounting policies.

## Before public launch

Arrange an independent review of RLS, payment flows, data-protection obligations, terms, refunds, tax handling, vendor verification, content moderation and incident response. Production readiness is an operational and legal process as well as a code state.
