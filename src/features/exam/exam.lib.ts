import { z } from 'zod';

/** Blank -> null, otherwise a number in range (comma accepted as decimal separator). */
function measurement(label: string, min: number, max: number, options: { decimals?: boolean } = {}) {
  return z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value) => (value === null || value === undefined ? '' : String(value).trim().replace(',', '.')))
    .refine((value) => value === '' || !Number.isNaN(Number(value)), `${label} harus berupa angka.`)
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || options.decimals || Number.isInteger(value), `${label} harus bilangan bulat.`)
    .refine((value) => value === null || (value >= min && value <= max), `${label} harus antara ${min} dan ${max}.`);
}

export const vitalsSchema = z
  .object({
    systolic: measurement('Sistolik', 50, 300),
    diastolic: measurement('Diastolik', 20, 200),
    pulse: measurement('Nadi', 20, 250),
    temperature: measurement('Suhu', 30, 45, { decimals: true }),
    respiratory_rate: measurement('Napas', 5, 80),
    spo2: measurement('SpO2', 50, 100),
    weight: measurement('Berat badan', 0.5, 400, { decimals: true }),
    height: measurement('Tinggi badan', 20, 250, { decimals: true }),
  })
  .refine((v) => Object.values(v).some((value) => value !== null), {
    message: 'Isi minimal satu tanda vital.',
    path: ['systolic'],
  })
  .refine((v) => (v.systolic === null) === (v.diastolic === null), {
    message: 'Tekanan darah perlu sistolik dan diastolik.',
    path: ['diastolic'],
  });

export type VitalsInput = z.input<typeof vitalsSchema>;
export type VitalsValues = z.output<typeof vitalsSchema>;

const noteText = z
  .string()
  .nullish()
  .transform((value) => (value ?? '').trim())
  .refine((value) => value.length <= 5000, 'Teks terlalu panjang, maksimal 5000 karakter.')
  .transform((value) => value || null);

export const soapSchema = z.object({
  subjective: noteText,
  objective: noteText,
  assessment: noteText,
  plan: noteText,
});

export const amendmentSchema = soapSchema.refine((v) => Object.values(v).some((value) => value !== null), {
  message: 'Tulis isi amandemen.',
  path: ['subjective'],
});

export type SoapInput = z.input<typeof soapSchema>;
export type SoapValues = z.output<typeof soapSchema>;

export const procedureSchema = z.object({
  service_id: z.uuid('Pilih tindakan.'),
  qty: z.coerce
    .number<string | number>({ error: 'Jumlah wajib diisi angka.' })
    .int('Jumlah harus bilangan bulat.')
    .min(1, 'Jumlah minimal 1.')
    .max(100, 'Jumlah maksimal 100.'),
  performed_by: z.uuid('Pilih pelaksana.'),
});

export type ProcedureInput = z.input<typeof procedureSchema>;

export const consumableSchema = z.object({
  medicine_id: z.uuid('Pilih bahan.'),
  qty: z.coerce
    .number<string | number>({ error: 'Jumlah wajib diisi angka.' })
    .int('Jumlah harus bilangan bulat.')
    .min(1, 'Jumlah minimal 1.')
    .max(1000, 'Jumlah maksimal 1000.'),
});

/** Form version: the picker keeps the medicine object to show its name. */
export const consumableFormSchema = z
  .object({
    medicine: z
      .object({ id: z.uuid(), name: z.string(), unit: z.string() })
      .nullable()
      .refine((medicine) => medicine !== null, 'Pilih bahan.'),
    qty: consumableSchema.shape.qty,
  })
  .transform(({ medicine, qty }) => ({ medicine_id: medicine!.id, qty }));

export type ConsumableFormInput = z.input<typeof consumableFormSchema>;
export type ConsumableValues = z.output<typeof consumableSchema>;
export type ProcedureValues = z.output<typeof procedureSchema>;

// Letters ---------------------------------------------------------------------------

const letterText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

export function sickLetterSchema(today: string) {
  return z.object({
    rest_from: z
      .string()
      .min(1, 'Tanggal mulai istirahat wajib diisi.')
      .pipe(z.iso.date('Tanggal tidak valid.'))
      .refine((value) => value >= today, 'Tanggal mulai istirahat tidak boleh sebelum hari ini.'),
    rest_days: z.coerce
      .number<string | number>({ error: 'Lama istirahat wajib diisi.' })
      .int('Lama istirahat harus bilangan bulat.')
      .min(1, 'Minimal 1 hari.')
      .max(30, 'Maksimal 30 hari.'),
    show_diagnosis: z.boolean(),
  });
}

export type SickLetterInput = z.input<ReturnType<typeof sickLetterSchema>>;
export type SickLetterValues = z.output<ReturnType<typeof sickLetterSchema>>;

export const referralLetterSchema = z.object({
  destination: z.string().trim().min(1, 'Faskes tujuan wajib diisi.').max(200, 'Maksimal 200 karakter.'),
  specialty: letterText(100, 'Maksimal 100 karakter.'),
  reason: z.string().trim().min(1, 'Alasan rujukan wajib diisi.').max(1000, 'Maksimal 1000 karakter.'),
  clinical_summary: letterText(2000, 'Maksimal 2000 karakter.'),
  therapy: letterText(1000, 'Maksimal 1000 karakter.'),
});

export type ReferralLetterInput = z.input<typeof referralLetterSchema>;
export type ReferralLetterValues = z.output<typeof referralLetterSchema>;

/** Last day of sick leave: rest_from + days - 1 (Jakarta calendar dates). */
export function restUntil(restFrom: string, restDays: number) {
  const date = new Date(`${restFrom}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + restDays - 1);

  return date.toISOString().slice(0, 10);
}

/** Body mass index rounded to 1 decimal, or null without both measurements. */
export function bodyMassIndex(weightKg: number | null, heightCm: number | null) {
  if (!weightKg || !heightCm) return null;

  const meters = heightCm / 100;

  return Math.round((weightKg / (meters * meters)) * 10) / 10;
}

export type VitalsReading = {
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  temperature: number | null;
  respiratory_rate: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
};

/** Short labels for vitals shown inline (queue rows, worklists). */
export const VITAL_SHORT_LABELS: Record<string, string> = {
  bp: 'TD',
  pulse: 'Nadi',
  temp: 'Suhu',
  rr: 'RR',
  spo2: 'SpO₂',
  weight: 'BB',
  height: 'TB',
  bmi: 'IMT',
};

export type VitalFlag = 'low' | 'high' | null;

export type VitalItem = {
  key: string;
  label: string;
  value: string;
  unit: string;
  flag: VitalFlag;
  flagLabel?: string;
};

/** Above/below a range; null inside it or when either bound is absent. */
function outside(value: number, low: number | null, high: number | null): VitalFlag {
  if (low !== null && value < low) return 'low';
  if (high !== null && value > high) return 'high';

  return null;
}

/**
 * A reading as display items, each flagged against common adult reference
 * ranges (a visual hint for the doctor, not a diagnosis).
 */
export function vitalItems(reading: VitalsReading): VitalItem[] {
  const items: VitalItem[] = [];
  const decimal = (value: number) => String(value).replace('.', ',');

  if (reading.systolic !== null && reading.diastolic !== null) {
    const flag =
      reading.systolic >= 140 || reading.diastolic >= 90
        ? 'high'
        : reading.systolic < 90 || reading.diastolic < 60
          ? 'low'
          : null;

    items.push({
      key: 'bp',
      label: 'Tekanan darah',
      value: `${reading.systolic}/${reading.diastolic}`,
      unit: 'mmHg',
      flag,
    });
  }

  if (reading.pulse !== null) {
    items.push({
      key: 'pulse',
      label: 'Nadi',
      value: String(reading.pulse),
      unit: 'x/mnt',
      flag: outside(reading.pulse, 60, 100),
    });
  }

  if (reading.temperature !== null) {
    const flag = outside(reading.temperature, 35, 37.4);

    items.push({
      key: 'temp',
      label: 'Suhu',
      value: decimal(reading.temperature),
      unit: '°C',
      flag,
      flagLabel: flag === 'high' ? 'Demam' : undefined,
    });
  }

  if (reading.respiratory_rate !== null) {
    items.push({
      key: 'rr',
      label: 'Napas',
      value: String(reading.respiratory_rate),
      unit: 'x/mnt',
      flag: outside(reading.respiratory_rate, 12, 20),
    });
  }

  if (reading.spo2 !== null) {
    items.push({
      key: 'spo2',
      label: 'SpO₂',
      value: String(reading.spo2),
      unit: '%',
      flag: outside(reading.spo2, 95, null),
    });
  }

  if (reading.weight !== null) {
    items.push({ key: 'weight', label: 'Berat', value: decimal(reading.weight), unit: 'kg', flag: null });
  }

  if (reading.height !== null) {
    items.push({ key: 'height', label: 'Tinggi', value: decimal(reading.height), unit: 'cm', flag: null });
  }

  const bmi = bodyMassIndex(reading.weight, reading.height);

  if (bmi !== null) {
    items.push({ key: 'bmi', label: 'IMT', value: decimal(bmi), unit: 'kg/m²', flag: outside(bmi, 18.5, 24.9) });
  }

  return items;
}

/** Search box -> code prefix search ("j06", "J06.9") or name search. Null when too short. */
export function parseIcd10Search(input: string) {
  const text = input.trim();

  if (text.length < 2) return null;
  if (/^[a-z]\d/i.test(text)) return { kind: 'code' as const, code: text.toUpperCase() };

  // Only letters, digits, spaces and dashes reach the PostgREST filter.
  const words = text.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();

  return words.length < 2 ? null : { kind: 'name' as const, text: words };
}

const EXAM_ERRORS: Record<string, string> = {
  not_your_patient: 'Hanya dokter yang menangani pasien ini yang bisa mengubah rekam medisnya.',
  not_in_exam: 'Pemeriksaan belum dimulai atau sudah selesai. Muat ulang halaman.',
  record_locked: 'Rekam medis sudah ditandatangani dan terkunci. Tambahkan amandemen untuk koreksi.',
  primary_diagnosis_required: 'Pilih minimal satu diagnosis utama sebelum menandatangani.',
  medicine_decision_required:
    'Tentukan resep dulu: tambahkan minimal satu obat, atau pilih "Tidak perlu obat" dengan alasannya.',
  soap_missing: 'Catatan SOAP belum ada. Isi dan simpan catatan terlebih dahulu.',
  soap_not_signed: 'Catatan SOAP belum ditandatangani.',
  amend_target_invalid: 'Amandemen hanya bisa ditambahkan pada rekam medis yang sudah ditandatangani.',
  amendment_empty: 'Tulis isi amandemen.',
  visit_closed: 'Tanda vital hanya bisa dicatat saat pasien menunggu atau diperiksa.',
  visit_not_found: 'Kunjungan tidak ditemukan. Muat ulang halaman.',
  not_allowed: 'Anda tidak punya akses untuk tindakan ini.',
  medicine_inactive: 'Obat ini sudah tidak aktif. Pilih obat lain.',
  compound_mismatch: 'Racikan tidak ditemukan. Muat ulang halaman.',
  service_inactive: 'Tindakan ini tidak aktif atau bukan tindakan. Pilih tindakan lain.',
  performer_invalid: 'Pelaksana harus dokter atau perawat yang aktif.',
};

/** Maps guard errors from the exam triggers and sign_visit() to messages. */
export function examErrorMessage(error: { code?: string; message?: string; details?: string }) {
  if (error.code === 'P0001' && error.message === 'insufficient_stock') {
    return `Stok bahan habis pakai ${error.details || ''} tidak cukup. Kurangi jumlahnya atau minta farmasi menambah stok, lalu tanda tangani lagi.`;
  }

  if (error.code === 'P0001' && error.message && EXAM_ERRORS[error.message]) return EXAM_ERRORS[error.message];
  if (error.code === '23505') return 'Diagnosis ini sudah dipilih.';
  if (error.code === '42501') return EXAM_ERRORS.not_allowed;

  return 'Rekam medis gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.';
}
