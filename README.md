# ServiceHub

ServiceHub is a multi-tenant appointment and shop-management app for barbershops. Customers can book a service with a chosen barber, while owners and barbers get role-specific tools to manage the schedule and shop operations.

> **Current release status:** portfolio MVP in local development. A public production demo and screenshots will be added after production hosting and Supabase configuration are completed. The no-backend preview uses example data and does not save or send bookings.

## Product features

- Public ServiceHub landing page with a directory of public shops.
- Shop-specific pages with contact details, current opening hours, service descriptions, prices, and booking links.
- Customer booking flow: service, barber (or any available barber), date/time availability, customer details, and confirmation.
- Availability checks for shop hours, barber hours/days off, service duration, existing bookings, and canceled appointments.
- Owner accounts and individually invited barber accounts.
- Owner workspace: dashboard, day/week/month calendar, appointments, customer history, services, barbers, manual payment records, analytics, and shop settings.
- Barber workspace: assigned appointments, calendar, related customer details, and limited appointment status updates.
- Per-day shop hours, barber-specific shifts, and days off.
- Responsive navigation with a mobile hamburger menu, light/dark/system themes, reduced-motion support, and page transitions.

## Screenshots and live demo

Screenshots and a live demo URL are pending deployment. Add images under `docs/screenshots/` and link them here when a production-ready shop is available. Do not use screenshots containing real customer information.

## Architecture

```text
Customer / Owner / Barber
            │
            ▼
React + TypeScript single-page app (Vite)
            │ Supabase JS client
            ▼
Supabase Auth ─ PostgreSQL + RLS ─ Database RPCs
                                      │
                                      └── Edge Function: barber invitations
```

Each shop is a tenant. Business-owned records carry a `business_id`; database row-level security enforces owner/barber boundaries. Public booking reads limited shop/service/barber information through RPC functions and submits bookings through a validated transaction. A PostgreSQL exclusion constraint prevents overlapping appointments, including concurrent requests. Business contact email is hidden from public and general authenticated table reads; owners retrieve it through an owner-scoped RPC.

## Technology

- **Frontend:** React 19, TypeScript, Vite 8, React Router 8, Tailwind CSS 4.
- **Charts:** Recharts.
- **Backend:** Supabase Auth, PostgreSQL, Row Level Security, SQL migrations, PostgREST RPC functions, Supabase Edge Functions (Deno).
- **Checks:** Vitest, jsdom, React Testing Library, `@testing-library/user-event`, Oxlint, GitHub Actions.

## Local development

Requirements: Node.js 22 and Docker Desktop (or a compatible container runtime) for the local Supabase stack.

```powershell
npm ci
npm run dev
```

The frontend opens at `http://localhost:5173`. With no Supabase configuration, public screens show clearly marked preview data, staff routes remain locked, and bookings are not persisted. **Do not enter real customer details in preview mode.**

### Local Supabase

1. Start Docker Desktop.
2. Run `npx supabase start` from the project directory.
3. Apply migrations with `npx supabase db reset`.
4. Copy `.env.example` to `.env.local`; set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the local API URL and publishable/anon key printed by the CLI. Never put a service-role key in a `VITE_` variable.
5. Restart Vite, create an owner at `/signup/owner`, then add services and barbers.
6. Inspect local confirmation email in Supabase Studio/Inbucket. Run `npx supabase functions serve invite-barber` in another terminal to test barber invitations.

### Barber invitation troubleshooting (production)

If a barber is saved but the invitation fails:

1. Open **Supabase Dashboard → Edge Functions → `invite-barber` → Logs** and retry once from the owner account. Check the invocation at that timestamp. The function response is now shown in the Barbers page so HTTP errors can be diagnosed without the SDK's generic message.
2. Confirm `invite-barber` is deployed to the same Supabase project used by the Vercel production build. From a logged-in Supabase CLI, deploy it with `npx supabase functions deploy invite-barber --project-ref <project-ref>`.
3. In the function's secrets/configuration, set `SITE_URL` to the exact public Vercel origin (for example `https://servicehub.example.com`, without a trailing slash). The function uses it for invitation email redirects and CORS.
4. In **Supabase Dashboard → Authentication → URL Configuration**, set the Site URL to the production origin and add `https://<production-domain>/barber/accept-invitation` to the allowed redirect URLs.
5. In **Vercel → Project → Settings → Environment Variables**, verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` reference that same Supabase project in the Production environment. Redeploy after changing Vercel environment variables.
6. Check **Supabase Dashboard → Authentication → SMTP Settings / Logs** if the function reports an email-delivery error. After correction, invite a new test email, open the link on the production domain, set a password, then sign in at `/login/barber`.

Do not add a Supabase service-role/secret key to a `VITE_` variable or expose it in Vercel's browser environment. The invitation function uses the server-side credentials supplied by Supabase's Edge Function runtime.

Each shop has a unique slug. Its public page is `/shop?shop=<slug>` and its booking page is `/book?shop=<slug>`. The root page is the ServiceHub directory.

## Verification

```powershell
npm test
npm run lint
npm run build
npx supabase start
npx supabase db reset
npx supabase test db --local
```

The frontend tests cover overlap rules, canceled appointments, service duration, opening-hour limits, and role-based status transitions. Database tests cover customer booking, duplicate booking prevention, cancellation freeing a slot, barber/owner permissions, tenant isolation, private customer data, and private business email. GitHub Actions runs these checks on pushes and pull requests.

## Payments and roadmap boundaries

Payment records are manual: staff mark an appointment paid or unpaid. ServiceHub does not currently process cards, transfers, or mobile-money transactions. Automated reminders, walk-in/POS workflows, and production deployment are not implemented yet.

## Portfolio summary

**Project description:** A multi-tenant scheduling and client-management product for barbershops, with public online booking and separate owner/barber workspaces.

**Project contribution:** Product requirements and workflow direction were defined by the project owner. The implementation was developed iteratively with AI assistance; the project owner should describe the code, architecture, and test work they personally completed when presenting it.

**Key engineering challenges:**

- Preventing overlapping bookings: availability checks plus a database exclusion constraint and transaction lock.
- Supporting different shops and staff roles: tenant-scoped records, role-specific UI, and RLS policies.
- Avoiding accidental exposure of customer and account data: public RPCs return narrow fields; private reads are owner/barber scoped.
- Keeping the first screen lightweight: route-level lazy loading splits dashboard/chart features into separate bundles.

**Live demo:** Pending.

**Repository:** Pending GitHub publication.

**Screenshots:** Pending production-safe captures.

## Production checklist

- Create a separate production Supabase project and apply migrations.
- Configure frontend `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the hosting provider; keep all server secrets in Supabase Edge Function secrets.
- Set the Edge Function `SITE_URL` and Supabase Auth redirect allow-list to the production origin.
- Run the database test suite against a fresh local database and review RLS before importing customer records.
- Enable backups, configure transactional email, monitor errors, and confirm hosting rewrites support React Router routes.
- Publish the repository and app only after replacing all environment placeholders and verifying the deployed booking flow.
