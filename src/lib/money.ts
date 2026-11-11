const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/** Formats integer rupiah, e.g. 150000 -> "Rp 150.000". */
export function formatRupiah(amount: number) {
  if (!Number.isSafeInteger(amount)) {
    throw new RangeError(`Rupiah amount must be a safe integer, got ${amount}`);
  }
  return rupiahFormatter.format(amount).replace(/ /g, " ");
}

/** Parses user input like "Rp 150.000" or "150000" into integer rupiah. Returns null when empty or invalid. */
export function parseRupiah(input: string) {
  const digits = input.replace(/[^\d-]/g, "");
  if (!/^-?\d+$/.test(digits)) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}
