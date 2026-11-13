# e-clinic

Clinic management system for an Indonesian klinik pratama: registration, queue, electronic medical
records, pharmacy, cashier, finance and reports, integrated with SATUSEHAT and BPJS PCare.

## Development

Requires bun. The app uses the hosted Supabase project (Singapore); there is no local Supabase.

```bash
bun install
bunx supabase login && bunx supabase link --project-ref <ref>
cp .env.example .env.local   # fill from Supabase dashboard → Project Settings → API Keys
bun run dev                  # http://localhost:3000
```

Schema changes: `bunx supabase migration new <name>`, then `bunx supabase db push --remote`,
then `bun run db:types`.

Checks: `bun run lint && bun run typecheck && bun run test`, and `bun run test:e2e`.

Test data (re-runnable): `bun --env-file=.env.local scripts/seed-test-data.ts` loads WHO ICD-10 2019
(+ Indonesian names for common diagnoses), test staff (`*.uji@klinik.test`, password `UjiKlinik#2026`),
polis, tariffs, schedules for every day, medicines, suppliers, stock, 20 test patients, and today's
visits at every stage. Deactivate the test staff and remove test data before go-live.

## Backup dan restore

A GitHub Actions workflow (`.github/workflows/backup.yml`) dumps the database every night at
01:00 WIB (roles, schema, data with `supabase db dump`), encrypts it with GPG (AES-256) and keeps it
as a workflow artifact for 30 days. Setup, once:

1. Repository → Settings → Secrets and variables → Actions → add `SUPABASE_DB_URL` (Supabase
   Dashboard → Connect → **Session pooler** string, with the database password) and
   `BACKUP_PASSPHRASE` (long random; store a copy outside GitHub, it is needed to restore).
2. Actions → "Daily database backup" → **Run workflow** once to check it works.

Restore (into a new or empty Supabase project):

```bash
gpg --decrypt e-clinic-YYYY-MM-DD.tar.gz.gpg > backup.tar.gz && mkdir backup && tar -xzf backup.tar.gz -C backup
psql --single-transaction --variable ON_ERROR_STOP=1 \
  --file backup/roles.sql --file backup/schema.sql \
  --command 'SET session_replication_role = replica' --file backup/data.sql \
  --dbname "<target connection string>"
```

The dump covers the database (including staff logins); Storage files (the clinic logo) are not in
it, re-upload them after a restore. Test a restore into a spare project at least once before
go-live, then tick the backup item below.

## Roadmap

Tick a box when the feature is built, tested, and merged. Indonesian names match the offer.

### 0. Foundation

- [x] Scaffold Next.js + TypeScript, Tailwind, shadcn/ui, ESLint, Vitest, Playwright
- [x] Supabase project, base migration (`clinics`, `profiles`, `counters`, `audit_logs`), seed
- [x] RLS helpers `auth_clinic_id()` / `auth_role()`, `requireRole()`
- [x] Login and authenticated layout with role-based navigation
- [x] TanStack Query client, Sonner toasts (query-key factory comes with the first `useQuery`)
- [x] `lib/money`, `lib/dates` (Asia/Jakarta) with tests
- [ ] Vercel (`sin1`) + Supabase (Singapore) projects, environments, Sentry, uptime monitor

### 1. Pendaftaran (Registration)

- [x] Data pasien: identity, NIK, BPJS number, phone, address
- [x] Pencarian pasien: by name, NIK, phone, or MRN
- [x] Nomor rekam medis otomatis (unique MRN)
- [x] Pendaftaran kunjungan: poli, doctor, payer (umum / BPJS)
- [ ] Cek kepesertaan BPJS\*
- [x] Riwayat kunjungan

### 2. Antrean (Queue)

- [x] Nomor antrean otomatis per poli, reset daily
- [x] Jadwal praktik dan kuota dokter
- [x] Status pasien realtime board
- [x] Lewati atau batalkan antrean (skip / cancel)

### 3. Pemeriksaan (Examination)

- [x] Tanda vital: BP, pulse, temp, respiratory rate, SpO2, weight, height
- [x] Catatan SOAP
- [x] Diagnosis ICD-10 search by disease name (import screen ready; load the clinic's list in Pengaturan → ICD-10)
- [x] Ringkasan kunjungan sebelumnya
- [x] Tindakan dan bahan habis pakai (billed automatically)
- [x] Resep elektronik
- [x] Surat sakit dan surat rujukan on clinic letterhead
- [x] Penguncian rekam medis (sign, lock, amendments)

### 4. Farmasi (Pharmacy)

- [x] Daftar resep masuk
- [x] Penyerahan obat (FEFO)
- [x] Obat racikan
- [x] Etiket obat (drug label printing)
- [x] Stok per batch dan kedaluwarsa
- [x] Peringatan stok: minimum stock and near-expiry
- [x] Pembelian dari supplier
- [x] Stok opname
- [x] Kartu stok

### 5. Kasir (Cashier)

- [x] Tagihan otomatis: consultation, procedures, medicines
- [x] Tarif dan paket layanan
- [x] Diskon per item or per invoice, with reason
- [x] Metode pembayaran: cash, QRIS, transfer
- [x] Struk pembayaran (thermal receipt)
- [x] Pasien BPJS without payment
- [x] Pembatalan tagihan (void with reason)

### 6. Keuangan dan Laporan (Finance and reports)

- [x] Dashboard pemilik (phone-friendly)
- [x] Laporan pendapatan: daily, monthly, per poli, per payment method
- [x] Laporan jasa medis dokter
- [x] Pengeluaran operasional
- [x] Laba rugi sederhana
- [x] Laporan kunjungan: per doctor and poli, new vs returning
- [x] 10 besar penyakit
- [x] Ekspor Excel dan PDF for every report

### 7. Integrasi SATUSEHAT dan BPJS

- [ ] SATUSEHAT client, token cache, sandbox credentials in Vault
- [ ] Outbox: `integration_jobs`, pg_cron runner, backoff, dead jobs
- [ ] SATUSEHAT: Patient/Practitioner IHS lookup by NIK
- [ ] SATUSEHAT: Encounter, Condition, vitals, medications
- [ ] BPJS PCare\*: registration and visit
- [ ] Status pengiriman data with resend button

### 8. Pengaturan dan Keamanan (Settings and security)

- [x] Hak akses per peran (RLS + server checks for every role)
- [x] Manajemen staf: add and deactivate accounts (admin sets and resets passwords)
- [x] Catatan aktivitas (activity log)
- [x] Profil klinik: logo, address, letterhead
- [x] Data master: polis, doctors, tariffs, medicines, suppliers
- [x] Logout otomatis (idle timeout)
- [ ] Backup harian (daily off-site backup, restore tested) (workflow ready; add secrets, run once, test a restore)

### 9. Go-live

- [ ] Excel templates and initial data import (medicines, tariffs, doctors, staff): medicines, suppliers and tariffs done (Pengaturan → Impor Excel); staff and doctors still to do
- [ ] Export all patient and transaction data to Excel
- [ ] SATUSEHAT registration and production testing
- [ ] E2E: full general visit and BPJS visit
- [ ] Staff training per role and user guide videos
- [ ] First-week online support

\* BPJS features are enabled once the clinic has a BPJS contract and PCare bridging access.
