# Deployment Guide

## 1. Create the Supabase project

Create a new Supabase project in the intended region. Keep the project URL, publishable key and service-role key available.

Apply the migration either with the Supabase CLI or through the SQL editor:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

The migration seeds categories and the singleton marketplace settings row. It intentionally does not seed products, vendors, buyers or orders.

## 2. Configure Supabase Auth

Set the production Site URL to the final HTTPS site, for example:

```text
https://marketplace.example.com
```

Add these redirect URLs for local and production use:

```text
http://localhost:5173/auth/callback
http://localhost:5173/auth/reset-password
https://marketplace.example.com/auth/callback
https://marketplace.example.com/auth/reset-password
```

Enable email/password authentication and email confirmation. Configure a real SMTP provider before launch so verification and reset email delivery is reliable.

## 3. Create the first administrator

Register through the normal signup page and verify the account. Then promote only that known account in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where email = 'owner@example.com';
```

Sign out and back in so the refreshed session loads the admin role.

## 4. Configure environment variables

In local `.env` and Netlify Site configuration, set:

```env
PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PUBLIC_SITE_URL=https://marketplace.example.com
```

The service-role and Stripe secret keys are server-only. Do not prefix them with `PUBLIC_`.

## 5. Validate and build

```bash
npm install
npm run verify
npm run check
npm run build
```

## 6. Deploy to Netlify

Connect the repository to Netlify or deploy through the CLI. The included `netlify.toml` and SvelteKit Netlify adapter provide the production build configuration.

Use:

```text
Build command: npm run build
Publish directory: build
```

After the first deployment, update `PUBLIC_SITE_URL`, Supabase Auth redirect URLs and the Stripe webhook URL to the final domain, then redeploy.

## 7. Post-deployment checks

- Open the empty marketplace and confirm no fabricated products appear.
- Register one buyer and one vendor test account.
- Promote the owner account to admin.
- Complete the workflow in `docs/TESTING.md` with Stripe test cards.
- Confirm Storage buckets and RLS policies exist.
- Confirm webhook deliveries return HTTP 200.
- Confirm no secret value appears in browser source, network responses or Netlify logs.
