"use client";

import { SearchIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PatientSearch } from "@/features/patients/patients-search";

/** True when the key press is meant for a text field, not a shortcut. */
function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  return Boolean(element?.closest("input, textarea, select, [contenteditable=true]"));
}

/** "Cari pasien" from anywhere: ⌘K / Ctrl+K, or "/" when not typing. */
export function AppShellSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (command || (event.key === "/" && !isTyping(event.target))) {
        event.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Cari pasien"
        className="flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-colors hover:text-foreground md:w-60 md:px-3"
      >
        <SearchIcon className="size-4" aria-hidden />
        <span className="hidden flex-1 text-left md:block">Cari pasien…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-sans text-[0.6875rem] font-medium md:block">Ctrl K</kbd>
      </button>
      <DialogContent
        showCloseButton={false}
        className="top-[12vh] translate-y-0 gap-0 p-3 sm:max-w-xl data-closed:slide-out-to-top-2 data-open:slide-in-from-top-2"
      >
        <DialogTitle className="sr-only">Cari pasien</DialogTitle>
        <PatientSearch variant="palette" onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
