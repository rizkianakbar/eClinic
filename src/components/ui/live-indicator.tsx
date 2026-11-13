/** "This list updates by itself": a small breathing dot and a label. */
export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-primary">
      <span className="signal-pulse size-1.5 rounded-full bg-current" aria-hidden />
      Diperbarui langsung
    </span>
  );
}
