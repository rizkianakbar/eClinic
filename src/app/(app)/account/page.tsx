import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShellTextSizePreview } from '@/features/app-shell/app-shell-text-size-preview';
import { ROLE_LABELS } from '@/features/auth/auth.constants';
import { getOwnProfile } from '@/features/auth/auth.service';
import { AuthChangePasswordForm } from '@/features/auth/auth-change-password-form';
import { SignOutButton } from '@/features/auth/auth-sign-out-button';
import { initials } from '@/features/patients/patients.lib';
import { requireRole } from '@/lib/auth';
import { formatDate } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Akun saya' };

const SHORTCUTS: [string[], string][] = [
  [['Ctrl', 'K'], 'Cari pasien dari halaman mana pun (⌘ K di Mac)'],
  [['/'], 'Cari pasien (saat tidak sedang mengetik)'],
  [['↑', '↓'], 'Pilih hasil pencarian'],
  [['Enter'], 'Buka pasien, atau daftarkan kunjungan'],
  [['Ctrl', 'S'], 'Simpan draf catatan SOAP'],
  [['Esc'], 'Tutup panel atau dialog'],
];

export default async function AccountPage() {
  const session = await requireRole();
  const profile = await getOwnProfile(await createClient(), session.userId);
  const clinical = session.role === 'doctor' || session.role === 'nurse' || session.role === 'pharmacist';

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <header className="flex flex-wrap items-center gap-5">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1d6b57,#0f3d33)] text-xl font-semibold text-white shadow-[0_8px_24px_-8px_rgb(15_61_51/0.5)]">
          {initials(session.fullName)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{session.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {ROLE_LABELS[session.role]} di {session.clinicName}
            {profile?.created_at && ` · akun sejak ${formatDate(profile.created_at)}`}
          </p>
        </div>
      </header>

      <Section title="Profil" description="Data diri Anda di klinik. Untuk mengubahnya, hubungi admin klinik.">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Fact label="Nama lengkap" value={session.fullName} />
          <Fact label="Email (untuk masuk)" value={profile?.email ?? '–'} />
          <Fact label="Peran" value={ROLE_LABELS[session.role]} />
          <Fact label="Klinik" value={session.clinicName} />
          {clinical && <Fact label="NIK" value={profile?.nik ?? 'Belum diisi'} />}
          {clinical && <Fact label="Nomor SIP" value={profile?.sip_number ?? 'Belum diisi'} />}
        </dl>
      </Section>

      <Section
        id="kata-sandi"
        title="Kata sandi"
        description="Gunakan minimal 8 karakter. Jangan pakai kata sandi yang sama dengan akun lain.">
        <AuthChangePasswordForm />
      </Section>

      <Section title="Tampilan" description="Ukuran teks berlaku di komputer ini saja, untuk semua halaman.">
        <AppShellTextSizePreview />
      </Section>

      <Section
        id="pintasan"
        title="Pintasan keyboard"
        description="Lebih cepat tanpa mouse, terutama di meja pendaftaran.">
        <ul className="flex flex-col divide-y">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
              <span>{label}</span>
              <span className="flex shrink-0 gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="flex h-6 min-w-6 items-center justify-center rounded-md border bg-background px-1.5 font-sans text-xs font-medium shadow-[0_1px_0_var(--border)]">
                    {key}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Sesi"
        description={`Komputer bersama: Anda otomatis keluar setelah ${session.idleLogoutMinutes} menit tidak dipakai. Keluar sendiri saat meninggalkan meja.`}>
        <SignOutButton />
      </Section>
    </div>
  );
}

type SectionProps = {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
};

/** Label and explanation on the left, the setting on the right. */
function Section(props: SectionProps) {
  return (
    <section
      id={props.id}
      className="scroll-mt-24 grid grid-cols-1 gap-4 border-t pt-8 md:grid-cols-[16rem_minmax(0,1fr)] md:gap-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{props.title}</h2>
        <p className="text-[0.8125rem] text-muted-foreground">{props.description}</p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">{props.children}</div>
    </section>
  );
}

type FactProps = {
  label: string;
  value: string;
};

function Fact(props: FactProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted-foreground">{props.label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium">{props.value}</dd>
    </div>
  );
}
