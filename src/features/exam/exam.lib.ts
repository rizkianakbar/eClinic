import { z } from 'zod';
import { keyed } from '@/i18n/keyed';
import type { AppLocale } from '@/i18n/locales';

/** Blank -> null, otherwise a number in range (comma accepted as decimal separator). */
function measurement(min: number, max: number, options: { decimals?: boolean } = {}) {
  return z
    .union([z.string(), z.number()])
    .nullish()
    .transform((value) => (value === null || value === undefined ? '' : String(value).trim().replace(',', '.')))
    .refine((value) => value === '' || !Number.isNaN(Number(value)), 'exam.errors.notNumber')
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || options.decimals || Number.isInteger(value), 'exam.errors.notInteger')
    .refine((value) => value === null || (value >= min && value <= max), keyed('exam.errors.range', { min, max }));
}

export const vitalsSchema = z
  .object({
    systolic: measurement(50, 300),
    diastolic: measurement(20, 200),
    pulse: measurement(20, 250),
    temperature: measurement(30, 45, { decimals: true }),
    respiratory_rate: measurement(5, 80),
    spo2: measurement(50, 100),
    weight: measurement(0.5, 400, { decimals: true }),
    height: measurement(20, 250, { decimals: true }),
  })
  .refine((v) => Object.values(v).some((value) => value !== null), {
    message: 'exam.errors.oneVital',
    path: ['systolic'],
  })
  .refine((v) => (v.systolic === null) === (v.diastolic === null), {
    message: 'exam.errors.bothPressures',
    path: ['diastolic'],
  });

export type VitalsInput = z.input<typeof vitalsSchema>;
export type VitalsValues = z.output<typeof vitalsSchema>;

const noteText = z
  .string()
  .nullish()
  .transform((value) => (value ?? '').trim())
  .refine((value) => value.length <= 5000, 'exam.errors.textTooLong')
  .transform((value) => value || null);

export const soapSchema = z.object({
  subjective: noteText,
  objective: noteText,
  assessment: noteText,
  plan: noteText,
});

export const amendmentSchema = soapSchema.refine((v) => Object.values(v).some((value) => value !== null), {
  message: 'exam.errors.amendmentEmpty',
  path: ['subjective'],
});

export type SoapInput = z.input<typeof soapSchema>;
export type SoapValues = z.output<typeof soapSchema>;

export const procedureSchema = z.object({
  service_id: z.uuid('exam.errors.pickProcedure'),
  qty: z.coerce
    .number<string | number>({ error: 'exam.errors.qtyNumber' })
    .int('exam.errors.qtyInteger')
    .min(1, keyed('exam.errors.qtyMin', { min: 1 }))
    .max(100, keyed('exam.errors.qtyMax', { max: 100 })),
  performed_by: z.uuid('exam.errors.pickPerformer'),
});

export type ProcedureInput = z.input<typeof procedureSchema>;

export const consumableSchema = z.object({
  medicine_id: z.uuid('exam.errors.pickConsumable'),
  qty: z.coerce
    .number<string | number>({ error: 'exam.errors.qtyNumber' })
    .int('exam.errors.qtyInteger')
    .min(1, keyed('exam.errors.qtyMin', { min: 1 }))
    .max(1000, keyed('exam.errors.qtyMax', { max: 1000 })),
});

/** Form version: the picker keeps the medicine object to show its name. */
export const consumableFormSchema = z
  .object({
    medicine: z
      .object({ id: z.uuid(), name: z.string(), unit: z.string() })
      .nullable()
      .refine((medicine) => medicine !== null, 'exam.errors.pickConsumable'),
    qty: consumableSchema.shape.qty,
  })
  .transform(({ medicine, qty }) => ({ medicine_id: medicine!.id, qty }));

export type ConsumableFormInput = z.input<typeof consumableFormSchema>;
export type ConsumableValues = z.output<typeof consumableSchema>;
export type ProcedureValues = z.output<typeof procedureSchema>;

// Letters ---------------------------------------------------------------------------

const letterText = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length <= max, keyed('exam.errors.maxLength', { max }))
    .transform((value) => value || null);

export function sickLetterSchema(today: string) {
  return z.object({
    rest_from: z
      .string()
      .min(1, 'exam.errors.restFromRequired')
      .pipe(z.iso.date('exam.errors.dateInvalid'))
      .refine((value) => value >= today, 'exam.errors.restFromPast'),
    rest_days: z.coerce
      .number<string | number>({ error: 'exam.errors.restDaysRequired' })
      .int('exam.errors.restDaysInteger')
      .min(1, 'exam.errors.restDaysMin')
      .max(30, 'exam.errors.restDaysMax'),
    show_diagnosis: z.boolean(),
  });
}

export type SickLetterInput = z.input<ReturnType<typeof sickLetterSchema>>;
export type SickLetterValues = z.output<ReturnType<typeof sickLetterSchema>>;

export const referralLetterSchema = z.object({
  destination: z
    .string()
    .trim()
    .min(1, 'exam.errors.destinationRequired')
    .max(200, keyed('exam.errors.maxLength', { max: 200 })),
  specialty: letterText(100),
  reason: z
    .string()
    .trim()
    .min(1, 'exam.errors.reasonRequired')
    .max(1000, keyed('exam.errors.maxLength', { max: 1000 })),
  clinical_summary: letterText(2000),
  therapy: letterText(1000),
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

export type VitalFlag = 'low' | 'high' | null;

/** Vital-sign keys: names under messages exam.vitals.<key> (short form: exam.vitals.short.<key>). */
export type VitalKey = 'bp' | 'pulse' | 'temp' | 'rr' | 'spo2' | 'weight' | 'height' | 'bmi';

export type VitalItem = {
  key: VitalKey;
  value: string;
  /** A unit, or 'perMinute' (worded per language: "x/mnt", "/min"). */
  unit: string;
  flag: VitalFlag;
  /** A more specific word for the flag (exam.vitals.flag.fever). */
  flagLabel?: 'fever';
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
export function vitalItems(reading: VitalsReading, locale: AppLocale = 'id'): VitalItem[] {
  const items: VitalItem[] = [];
  const decimal = (value: number) => (locale === 'id' ? String(value).replace('.', ',') : String(value));

  if (reading.systolic !== null && reading.diastolic !== null) {
    const flag =
      reading.systolic >= 140 || reading.diastolic >= 90
        ? 'high'
        : reading.systolic < 90 || reading.diastolic < 60
          ? 'low'
          : null;

    items.push({
      key: 'bp',
      value: `${reading.systolic}/${reading.diastolic}`,
      unit: 'mmHg',
      flag,
    });
  }

  if (reading.pulse !== null) {
    items.push({
      key: 'pulse',
      value: String(reading.pulse),
      unit: 'perMinute',
      flag: outside(reading.pulse, 60, 100),
    });
  }

  if (reading.temperature !== null) {
    const flag = outside(reading.temperature, 35, 37.4);

    items.push({
      key: 'temp',
      value: decimal(reading.temperature),
      unit: '°C',
      flag,
      flagLabel: flag === 'high' ? 'fever' : undefined,
    });
  }

  if (reading.respiratory_rate !== null) {
    items.push({
      key: 'rr',
      value: String(reading.respiratory_rate),
      unit: 'perMinute',
      flag: outside(reading.respiratory_rate, 12, 20),
    });
  }

  if (reading.spo2 !== null) {
    items.push({
      key: 'spo2',
      value: String(reading.spo2),
      unit: '%',
      flag: outside(reading.spo2, 95, null),
    });
  }

  if (reading.weight !== null) {
    items.push({ key: 'weight', value: decimal(reading.weight), unit: 'kg', flag: null });
  }

  if (reading.height !== null) {
    items.push({ key: 'height', value: decimal(reading.height), unit: 'cm', flag: null });
  }

  const bmi = bodyMassIndex(reading.weight, reading.height);

  if (bmi !== null) {
    items.push({ key: 'bmi', value: decimal(bmi), unit: 'kg/m²', flag: outside(bmi, 18.5, 24.9) });
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

/** Guard keys raised by the exam triggers and sign_visit(); each has a message under exam.errors. */
const EXAM_ERRORS = new Set([
  'not_your_patient',
  'not_in_exam',
  'record_locked',
  'primary_diagnosis_required',
  'medicine_decision_required',
  'soap_missing',
  'soap_not_signed',
  'amend_target_invalid',
  'amendment_empty',
  'visit_closed',
  'visit_not_found',
  'not_allowed',
  'medicine_inactive',
  'compound_mismatch',
  'service_inactive',
  'performer_invalid',
]);

/** Maps guard errors from the exam triggers and sign_visit() to message keys (short stock names the item). */
export function examErrorMessage(error: { code?: string; message?: string; details?: string }) {
  if (error.code === 'P0001' && error.message === 'insufficient_stock') {
    return keyed('exam.errors.insufficient_stock', { item: error.details ?? '' });
  }

  if (error.code === 'P0001' && error.message && EXAM_ERRORS.has(error.message)) return `exam.errors.${error.message}`;
  if (error.code === '23505') return 'exam.errors.duplicateDiagnosis';
  if (error.code === '42501') return 'exam.errors.not_allowed';

  return 'exam.errors.failed';
}

type Icd10Names = { name: string; name_id: string | null } | null | undefined;

/** The diagnosis name in the reader's language: the Indonesian name when there is one, else the WHO English name. */
export function icd10Name(icd10: Icd10Names, locale: AppLocale) {
  if (!icd10) return '';

  return locale === 'en' ? icd10.name : (icd10.name_id ?? icd10.name);
}
