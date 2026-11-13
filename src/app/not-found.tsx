import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="numeral text-[3rem] text-muted-foreground/60">404</p>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">Periksa alamatnya, atau kembali ke beranda.</p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        Ke beranda
      </Link>
    </main>
  );
}
