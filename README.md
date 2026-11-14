# e-clinic

A clinic management system for Indonesian primary-care clinics (*klinik pratama*), built for a real
client clinic. It runs the whole patient visit in one browser app: registration, queue, electronic
medical records, pharmacy, cashier, and the owner's finance reports. It is designed to send data to
the national health platforms (SATUSEHAT and BPJS PCare).

The interface is available in Bahasa Indonesia and English, and each staff member picks one.

<!-- Live demo: add the URL here. The login page offers one-click test accounts for every role. -->

## What it does

A visit moves through five stations, and each staff role works from its own station:

```
Front desk  ->  Waiting room  ->  Exam room  ->  Pharmacy  ->  Cashier  ->  Done
register        vitals (nurse)    SOAP, ICD-10,   FEFO          invoice,
+ queue no.                       prescription,   dispensing,   discount,
                                  sign record     drug labels   payment
```

| Module | Highlights |
| --- | --- |
| Registration | Patient search by name, NIK, phone or MRN; auto MRN; visits by poli, doctor and payer (general or BPJS) |
| Queue | Daily numbering per poli; doctor schedules with patient quotas; live status board; skip and cancel |
| Examination | Vitals, SOAP notes, ICD-10 search, previous-visit summary, procedures and consumables, e-prescription, sick and referral letters; records lock on signing, and later changes are stored as amendments |
| Pharmacy & inventory | Incoming prescriptions, FEFO dispensing, compounded prescriptions, stock per batch with expiry, low-stock and near-expiry alerts, purchases, stock opname, stock card |
| Cashier | Invoice built automatically from the visit, service packages, item and invoice discounts with a reason, cash, QRIS or transfer, thermal receipt, void with a reason |
| Reports (owner) | Dashboard that works on a phone, revenue, doctor fees, expenses, profit and loss using batch cost, visit statistics, top 10 diagnoses, Excel and PDF export |
| Settings | Role-based access for 7 roles, staff management, activity log, clinic profile and letterhead, master data, Excel import, idle auto-logout |

## Tech stack

- **Next.js 16** (App Router, React Server Components, Server Actions), **TypeScript** in strict mode
- **Supabase**: Postgres, Auth, Row Level Security, Realtime, Storage
- **Tailwind CSS** and **shadcn/ui**, **TanStack Query** and **TanStack Table**, **React Hook Form** with **Zod**, **next-intl**
- **Vitest** and **Playwright** for tests, **Biome** for linting and formatting, **bun** as the package manager
- Hosted on Vercel (`sin1`) next to Supabase in Singapore

## Engineering decisions

**The database enforces the rules.** Every operation that writes to several tables at once is a
single Postgres function called through `supabase.rpc()`. This covers visit creation with queue
numbering, dispensing, checkout, voiding, receiving purchases and stock opname. Each one either
completes fully or not at all. The functions live in a `private` schema that the API does not expose,
check the caller's role and clinic themselves, and are reached through thin `SECURITY INVOKER`
wrappers. Users have no direct write access to stock tables.

**Multi-tenant from the first migration.** Every business table has a `clinic_id`. Row Level
Security is enabled on all tables, with policies based on `auth_clinic_id()` and `auth_role()`. Role
checks are also repeated in every Server Action, so access is enforced in two places.

**Clinical and financial integrity.**
- The visit status is a state machine whose transitions are checked in database triggers.
- Signed medical records can only be changed by adding amendments.
- Paid invoices are never edited. A correction means voiding the invoice and issuing a new one.
- Nothing clinical or financial is ever hard-deleted.
- Stock changes only through a ledger (`stock_movements`), with batch rows locked using `FOR UPDATE`.
- Money is stored as whole rupiah in `bigint` columns.
- Dates are stored in UTC, and reports use Asia/Jakarta time.
- MRN, invoice and queue numbers come from counter rows locked during the update.

**Feature-based structure, thin routes.** Route files only parse input with Zod, check the user's role
and call a service. Business logic lives in `src/features/<feature>/<feature>.service.ts`, written as
plain functions that receive a Supabase client so they can be tested. Each feature keeps its
components, actions, schemas, hooks and tests together:

```
src/features/pharmacy/
  pharmacy.tsx                  worklist
  pharmacy-dispense-dialog.tsx  dialog
  pharmacy.actions.ts           Server Actions (thin)
  pharmacy.service.ts           business logic (server-only)
  pharmacy.lib.ts               Zod schemas, pure helpers
  pharmacy.test.ts
```

**Fast navigation on clinic hardware.**
- Server Components fetch independent data in parallel, so requests do not wait on each other.
- Secondary panels stream in behind `Suspense` placeholders shaped like the final content.
- Every route has its own loading screen showing the real page layout.
- Links are prefetched when the user hovers over or focuses them.
- One filtered Realtime channel feeds every live view: the queue, worklists and status board.

**Integrations use the outbox pattern (in progress).** SATUSEHAT (FHIR R4) and BPJS PCare are never
called during a user's request. Each completed visit adds a row to `integration_jobs` in the same
transaction. A pg_cron worker claims jobs with `FOR UPDATE SKIP LOCKED`, waits for parent resources to
sync first, retries with backoff and marks jobs as dead after repeated failures. Staff can resend
failed jobs from a status screen.

**Privacy.** Patient data is sensitive health data under Indonesian law (UU PDP 27/2022). Logs contain
ids only, storage buckets are private, sessions log out after an idle period, and the clinic can
export all of its data to Excel.

## Project layout

```
src/app/            routes only (thin page, layout and route files)
src/features/       one folder per domain: patients, visits, queue, exam, prescriptions,
                    pharmacy, inventory, billing, expenses, reports, settings, ...
src/components/ui/  shared UI (shadcn/ui and design-system pieces)
src/lib/            Supabase clients, auth helpers, money and date utilities, query keys
supabase/migrations SQL migrations: schema, RLS policies and Postgres functions
messages/           id.json and en.json translations (key parity checked by a test)
tests/e2e/          Playwright specs
```

## Running locally

Requires [bun](https://bun.sh) and a Supabase project.

```bash
bun install
bunx supabase link --project-ref <ref>
bunx supabase db push                     # apply the migrations
cp .env.example .env.local                # Supabase URL, publishable key, secret key
bun --env-file=.env.local scripts/seed-test-data.ts   # optional: test staff, master data, sample visits
bun run dev
```

The seed script creates one test account for each role (`*.uji@klinik.test`). In development, the
login page shows one-click buttons for these accounts. To show them in a production demo, set
`DEMO_LOGIN=true`.

```bash
bun run lint && bun run typecheck && bun run test   # Biome, tsc, Vitest
bun run test:e2e                                    # Playwright
```

A nightly GitHub Actions workflow (`.github/workflows/backup.yml`) backs up the database with
`supabase db dump`, encrypts the dump with GPG, and keeps it as a workflow artifact.

## Status

| Area | Status |
| --- | --- |
| Registration, queue, examination, pharmacy, inventory, cashier, reports, settings | Done |
| Excel import (medicines, suppliers, tariffs) | Done; staff and doctors still to do |
| SATUSEHAT and BPJS PCare integration | Next: the outbox and FHIR mappers are designed but not built yet |
| Production hardening (Sentry, uptime monitoring, tested restore) | Not started |
