# Stripe Test-Mode Setup

## Connect

Enable Stripe Connect and use Express connected accounts. The vendor onboarding endpoint creates or reuses the connected account and redirects the vendor to Stripe-hosted onboarding.

The application records:

- connected account ID
- charges enabled
- payouts enabled
- details submitted

A vendor must be approved by AssetGuru and have payouts enabled before submitting products.

## Checkout

Checkout Sessions are created server-side from published product records. Browser prices are never trusted. The server resolves the product, licence tier, current approved version, commission and vendor account before creating a pending order.

The checkout uses GBP and Stripe-hosted payment collection. Automatic Tax is enabled in the checkout endpoint; enable Stripe Tax in the Stripe account before testing production-like tax behaviour. Disable `automatic_tax` in the endpoint only when intentionally operating without Stripe Tax.

## Webhook

Register this endpoint in Stripe test mode:

```text
https://YOUR_DOMAIN/api/stripe/webhook
```

Subscribe to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `account.updated`
- `charge.dispute.created`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

For local testing with Stripe CLI:

```bash
stripe listen --forward-to localhost:5173/api/stripe/webhook
```

Use the CLI-provided `whsec_...` value in the local `.env`.

## Commission and payout model

AssetGuru creates the charge on the platform account. After a successful payment webhook, it creates a transfer for each vendor’s net amount to that vendor’s connected account. The transfer ID and payout record are stored against the order item.

Commission is calculated server-side from:

1. vendor-specific commission, when set;
2. category override, when set;
3. marketplace default commission.

## Refunds

An approved refund:

- creates a Stripe refund for the order item amount;
- reverses the corresponding vendor transfer;
- marks the payout reversed;
- revokes the buyer entitlement;
- updates order and item status;
- recalculates product sales;
- writes an audit event and notifications.

Test refunds and transfer reversals before inviting vendors. Confirm the platform balance can cover refunds where connected-account funds are unavailable.
