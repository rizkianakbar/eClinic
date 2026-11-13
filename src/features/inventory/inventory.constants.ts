export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  purchase: 'Pembelian',
  dispense: 'Penyerahan',
  consumable: 'Bahan habis pakai',
  opname: 'Stok opname',
};

export const STOCK_LEVEL_LABELS = { empty: 'Habis', low: 'Menipis', ok: 'Aman' } as const;

export const STOCK_FILTER_LABELS = { all: 'Semua', low: 'Stok menipis', expiring: 'Hampir kedaluwarsa' } as const;

/** Pharmacy pages: pharmacist plus management. */
export const PHARMACY_ROLES = ['pharmacist', 'admin', 'owner'] as const;
