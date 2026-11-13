"use client";

import { AppShellTextSize } from "./app-shell-text-size";

/** Text size choice with a sample of how a queue row will read. */
export function AppShellTextSizePreview() {
  return (
    <div className="flex flex-col gap-4">
      <AppShellTextSize />
      <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
        <span className="numeral flex size-10 items-center justify-center rounded-lg bg-status-waiting-soft text-lg text-status-waiting">7</span>
        <span>
          <span className="block text-sm font-semibold">Contoh nama pasien</span>
          <span className="block text-[0.8125rem] text-muted-foreground">Poli Umum · dr. Contoh · menunggu 5 mnt</span>
        </span>
      </div>
    </div>
  );
}
