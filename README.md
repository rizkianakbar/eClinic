# e-clinic

Clinic management system for an Indonesian klinik pratama: registration, queue, electronic medical
records, pharmacy, cashier, finance and reports, integrated with SATUSEHAT and BPJS PCare.

## Roadmap

Tick a box when the feature is built, tested, and merged. Indonesian names match the offer.

### 0. Foundation

- [ ] Scaffold Next.js + TypeScript, Tailwind, shadcn/ui, ESLint, Vitest, Playwright
- [ ] Local Supabase, base migration (`clinics`, `profiles`, `counters`, `audit_logs`), seed
- [ ] RLS helpers `auth_clinic_id()` / `auth_role()`, `requireRole()`
- [ ] Login and authenticated layout with role-based navigation
- [ ] TanStack Query client, query-key factory, Sonner toasts
- [ ] `lib/money`, `lib/dates` (Asia/Jakarta) with tests
- [ ] Vercel (`sin1`) + Supabase (Singapore) projects, environments, Sentry, uptime monitor

### 1. Pendaftaran (Registration)

- [ ] Data pasien: identity, NIK, BPJS number, phone, address
- [ ] Pencarian pasien: by name, NIK, phone, or MRN
- [ ] Nomor rekam medis otomatis (unique MRN)
- [ ] Kartu berobat dengan QR code: print card, scan to open patient
- [ ] Pendaftaran kunjungan: poli, doctor, payer (umum / BPJS)
- [ ] Cek kepesertaan BPJS\*
- [ ] Riwayat kunjungan

### 2. Antrean (Queue)

- [ ] Nomor antrean otomatis per poli or doctor, reset daily
- [ ] Jadwal praktik dan kuota dokter
- [ ] Layar panggil antrean (TV) with voice
- [ ] Status pasien realtime board
- [ ] Lewati atau batalkan antrean (skip / cancel)

### 3. Pemeriksaan (Examination)

- [ ] Tanda vital: BP, pulse, temp, respiratory rate, SpO2, weight, height
- [ ] Catatan SOAP
- [ ] Diagnosis ICD-10 search by disease name (ICD-10 reference data loaded)
- [ ] Ringkasan kunjungan sebelumnya
- [ ] Template SOAP dan resep favorit per doctor
- [ ] Tindakan dan bahan habis pakai (billed automatically)
- [ ] Resep elektronik
- [ ] Surat sakit dan surat rujukan on clinic letterhead
- [ ] Penguncian rekam medis (sign, lock, amendments)

### 4. Farmasi (Pharmacy)

- [ ] Daftar resep masuk
- [ ] Penyerahan obat (FEFO)
- [ ] Obat racikan
- [ ] Etiket obat (drug label printing)
- [ ] Stok per batch dan kedaluwarsa
- [ ] Peringatan stok: minimum stock and near-expiry
- [ ] Pembelian dari supplier
- [ ] Stok opname
- [ ] Kartu stok

### 5. Kasir (Cashier)

- [ ] Tagihan otomatis: consultation, procedures, medicines
- [ ] Tarif dan paket layanan
- [ ] Diskon per item or per invoice, with reason
- [ ] Metode pembayaran: cash, QRIS, transfer
- [ ] Struk pembayaran (thermal receipt)
- [ ] Pasien BPJS without payment
- [ ] Buka dan tutup kasir (shift, counted vs expected)
- [ ] Pembatalan tagihan (void with reason)

### 6. Keuangan dan Laporan (Finance and reports)

- [ ] Dashboard pemilik (phone-friendly)
- [ ] Laporan pendapatan: daily, monthly, per poli, per payment method
- [ ] Laporan jasa medis dokter
- [ ] Pengeluaran operasional
- [ ] Laba rugi sederhana
- [ ] Laporan kunjungan: per doctor and poli, new vs returning
- [ ] 10 besar penyakit
- [ ] Laporan ke Dinas Kesehatan (monthly recap)
- [ ] Ekspor Excel dan PDF for every report

### 7. Integrasi SATUSEHAT dan BPJS

- [ ] SATUSEHAT client, token cache, sandbox credentials in Vault
- [ ] Outbox: `integration_jobs`, pg_cron runner, backoff, dead jobs
- [ ] SATUSEHAT: Patient/Practitioner IHS lookup by NIK
- [ ] SATUSEHAT: Encounter, Condition, vitals, medications
- [ ] BPJS PCare\*: registration and visit
- [ ] Status pengiriman data with resend button

### 8. Pengaturan dan Keamanan (Settings and security)

- [ ] Hak akses per peran (RLS + server checks for every role)
- [ ] Manajemen staf: add and deactivate accounts
- [ ] Catatan aktivitas (activity log)
- [ ] Profil klinik: logo, address, letterhead
- [ ] Data master: polis, doctors, tariffs, medicines, suppliers
- [ ] Logout otomatis (idle timeout)
- [ ] Backup harian (daily off-site backup, restore tested)

### 9. Go-live

- [ ] Excel templates and initial data import (medicines, tariffs, doctors, staff)
- [ ] Export all patient and transaction data to Excel
- [ ] SATUSEHAT registration and production testing
- [ ] E2E: full general visit and BPJS visit
- [ ] Staff training per role and user guide videos
- [ ] First-week online support

\* BPJS features are enabled once the clinic has a BPJS contract and PCare bridging access.
