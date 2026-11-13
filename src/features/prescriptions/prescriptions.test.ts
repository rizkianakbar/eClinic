import { describe, expect, it } from 'vitest';
import {
  compoundFormSchema,
  compoundSchema,
  noMedicineSchema,
  prescriptionItemFormSchema,
  prescriptionItemSchema,
} from './prescriptions.lib';

const MED_A = '6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11';
const MED_B = '0c6a3f2e-7d4b-4c1e-8a59-3b2d1e0f9c77';

describe('prescriptionItemSchema', () => {
  it('requires a medicine, a whole quantity and a signa', () => {
    expect(prescriptionItemSchema.parse({ medicine_id: MED_A, qty: '10', signa: ' 3 x 1 ' })).toEqual({
      medicine_id: MED_A,
      qty: 10,
      signa: '3 x 1',
    });

    const messages = prescriptionItemSchema
      .safeParse({ medicine_id: '', qty: '1.5', signa: '' })
      .error?.issues.map((issue) => issue.message);

    expect(messages).toEqual(
      expect.arrayContaining(['rx.errors.pickMedicine', 'rx.errors.integer', 'rx.errors.signaRequired']),
    );
  });
});

describe('compoundSchema', () => {
  const valid = {
    form: 'puyer',
    quantity: '10',
    signa: '3 x 1 puyer',
    ingredients: [
      { medicine_id: MED_A, qty: '5' },
      { medicine_id: MED_B, qty: '3' },
    ],
  };

  it('parses a racikan with its ingredients', () => {
    expect(compoundSchema.parse(valid)).toMatchObject({ quantity: 10, ingredients: [{ qty: 5 }, { qty: 3 }] });
  });

  it('needs at least one ingredient and no duplicates', () => {
    expect(compoundSchema.safeParse({ ...valid, ingredients: [] }).error?.issues[0]?.message).toBe(
      'rx.errors.oneIngredient',
    );

    expect(
      compoundSchema.safeParse({ ...valid, ingredients: [valid.ingredients[0], valid.ingredients[0]] }).error?.issues[0]
        ?.message,
    ).toBe('rx.errors.duplicateIngredients');
  });
});

describe('form schemas', () => {
  const med = { id: MED_A, name: 'Paracetamol 500 mg', unit: 'tablet' };

  it('turn a picked medicine into medicine_id', () => {
    expect(prescriptionItemFormSchema.parse({ medicine: med, qty: '10', signa: '3 x 1' })).toEqual({
      medicine_id: MED_A,
      qty: 10,
      signa: '3 x 1',
    });

    expect(
      prescriptionItemFormSchema.safeParse({ medicine: null, qty: '1', signa: 'x' }).error?.issues[0]?.message,
    ).toBe('rx.errors.pickMedicine');
  });

  it('validates racikan ingredients through the server schema', () => {
    const result = compoundFormSchema.safeParse({
      form: 'puyer',
      quantity: '10',
      signa: '3 x 1',
      ingredients: [
        { medicine: med, qty: '5' },
        { medicine: med, qty: '2' },
      ],
    });

    expect(result.error?.issues[0]?.message).toBe('rx.errors.duplicateIngredients');
  });
});

describe('noMedicineSchema', () => {
  it('needs a short reason, trimmed', () => {
    expect(noMedicineSchema.parse({ reason: '  Edukasi saja  ' })).toEqual({ reason: 'Edukasi saja' });
    expect(noMedicineSchema.safeParse({ reason: ' ok ' }).success).toBe(false);
    expect(noMedicineSchema.safeParse({ reason: 'x'.repeat(201) }).success).toBe(false);
  });
});
