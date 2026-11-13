import { SearchXIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <SearchXIcon className="size-6" aria-hidden />
      </span>
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold">Data tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground">
          Tautan ini mungkin salah, atau datanya milik klinik lain. Kembali lalu buka dari daftar.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Ke beranda
      </Link>
    </div>
  );
}
