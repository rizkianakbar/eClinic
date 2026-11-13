/** Shown inside the app frame while a page's data loads. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8" aria-busy aria-label="Memuat halaman">
      <div className="flex flex-col gap-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-muted/70" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((tile) => (
          <div key={tile} className="h-24 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-14 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
