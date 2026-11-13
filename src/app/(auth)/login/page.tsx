import { HeartPulseIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { devLoginEnabled, listTestAccounts } from '@/features/auth/auth.service';
import { LoginForm } from '@/features/auth/auth-login-form';
import { AuthTestAccounts } from '@/features/auth/auth-test-accounts';
import { JOURNEY } from '@/features/visits/visits.lib';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata: Metadata = { title: 'Masuk' };

const STATION_DOTS = ['#d4952b', '#3a7bd5', '#7a5bd1', '#22936f', '#8fa29d'];

export default async function LoginPage(props: PageProps<'/login'>) {
  const { reason } = await props.searchParams;
  const testAccounts = devLoginEnabled() ? await listTestAccounts(createAdminClient()) : [];

  return (
    <main className="grid grid-cols-1 min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(120%_80%_at_0%_0%,#1d5c4c_0%,#0f2f28_55%,#0b221d_100%)] p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <HeartPulseIcon className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">e-clinic</span>
        </div>

        <div className="flex max-w-md flex-col gap-10">
          <p className="text-[2rem] leading-[1.15] font-semibold tracking-tight">
            Satu alur untuk setiap pasien, dari pendaftaran sampai pulang.
          </p>
          {/* The patient journey, the idea the whole app is built around. */}
          <ol className="grid grid-cols-5" aria-hidden>
            {JOURNEY.map((station, index) => (
              <li key={station.status} className="relative flex flex-col items-center gap-2.5 text-center">
                {index < JOURNEY.length - 1 && (
                  <span
                    className="absolute top-1.5 left-1/2 h-0.5 w-full -translate-y-1/2"
                    style={{ background: STATION_DOTS[index] }}
                  />
                )}
                <span
                  className="relative size-3 rounded-full ring-4 ring-[#0f2f28]"
                  style={{ background: STATION_DOTS[index] }}
                />
                <span className="text-xs text-white/70">{station.short}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-white/55">Rekam medis elektronik · Farmasi · Kasir · Laporan</p>
      </section>

      <section className="flex items-start justify-center px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-10 sm:px-10 lg:items-center">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">e-clinic</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">Masuk</h1>
            <p className="text-sm text-muted-foreground">Gunakan email dan kata sandi akun staf Anda.</p>
          </div>
          {reason === 'idle' && (
            <p
              role="status"
              className="rounded-lg border border-status-waiting/20 bg-status-waiting-soft px-3.5 py-3 text-sm text-status-waiting">
              Anda keluar otomatis karena komputer tidak dipakai beberapa saat. Silakan masuk kembali.
            </p>
          )}
          <LoginForm />
          <p className="text-[0.8125rem] text-muted-foreground">
            Lupa kata sandi? Minta admin klinik mengatur ulang di Pengaturan → Staf.
          </p>
          {testAccounts.length > 0 && <AuthTestAccounts accounts={testAccounts} />}
        </div>
      </section>
    </main>
  );
}
