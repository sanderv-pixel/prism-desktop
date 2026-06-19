# Prism Production Deployment Guide

## 1. Prerequisites

- Node.js 20+
- A Supabase project
- A Stripe account (for advertiser billing)
- A server/host that can run the Next.js standalone output (VPS, Railway, Fly.io, etc.)

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in all required values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRICE_ID`
- `NEXT_PUBLIC_SITE_URL`
- `PRISM_API_URL`

Optional but recommended:
- `PRISM_API_KEYS` - comma-separated keys for extension/CLI clients.
- `DEMO_AUTH_ENABLED=false` - keep disabled in production.

## 3. Database setup

Link your Supabase project and push migrations:

```bash
cd apps/web
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This enables RLS, indexes, and constraints required for production.

## 4. Stripe setup

1. Create a subscription product and price in Stripe.
2. Copy the price ID to `STRIPE_PRICE_ID`.
3. Add a webhook endpoint: `https://your-domain.com/api/webhooks/stripe`.
4. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
5. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`.

## 5. Build

```bash
npm install
npm run build:shared
npm run build:extension
npm run build:browser-extension
npm run build:web
```

## 6. Start

The web app is built with `output: 'standalone'`:

```bash
cd apps/web
npm start
```

Default port is `3000`. Set `PORT=3000` if needed.

## 7. Health check

Visit `https://your-domain.com/api/health` to confirm the server is running.

## 8. Security notes

- Keep `DEMO_AUTH_ENABLED=false` in production.
- Generate strong `PRISM_API_KEYS` if you enable API key enforcement.
- Supabase RLS is enabled; service-role key must never be exposed client-side.
- Sign-up uses Supabase Auth email confirmation plus a honeypot field.
- Rate limiting is in-memory. For multi-instance deployments, replace with Redis.

## 9. Browser extension

Build and load the browser extension from `apps/browser-extension/dist/`:

```bash
cd apps/browser-extension
npm run build
npm run package
```

Upload `prism-browser-extension.zip` to the Chrome Web Store (or load unpacked for testing).

## 10. Editor extension

Build and install the VS Code/Cursor extension:

```bash
cd apps/extension
npm run package:cursor
```

Install `prism-cursor.vsix` in Cursor/VS Code.
