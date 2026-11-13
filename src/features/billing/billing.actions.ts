'use server';

import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { CASHIER_ROLES } from './billing.constants';
import {
  type DiscountInput,
  discountSchema,
  type InvoiceServiceInput,
  invoiceServiceSchema,
  type PackageItemsInput,
  type PaymentInput,
  packageItemsSchema,
  paymentSchema,
  type ServiceInput,
  serviceSchema,
  type VoidValues,
  voidSchema,
} from './billing.lib';
import {
  addInvoiceService,
  createInvoice,
  createService,
  payInvoice,
  removeInvoiceItem,
  setInvoiceDiscount,
  setItemDiscount,
  setPackageItems,
  updateService,
  voidInvoice,
} from './billing.service';

const MANAGERS = ['owner', 'admin'] as const;
const NOT_FOUND: ActionResult<never> = { ok: false, error: 'billing.errors.serviceNotFound' };
const isId = (value: string) => z.uuid().safeParse(value).success;

export async function createServiceAction(input: ServiceInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);

  const parsed = serviceSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return createService(await createClient(), parsed.data);
}

export async function updateServiceAction(serviceId: string, input: ServiceInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(serviceId)) return NOT_FOUND;

  const parsed = serviceSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return updateService(await createClient(), serviceId, parsed.data);
}

export async function setServiceActiveAction(serviceId: string, isActive: boolean): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(serviceId)) return NOT_FOUND;

  return updateService(await createClient(), serviceId, { is_active: isActive === true });
}

// Invoices ------------------------------------------------------------------------

export async function createInvoiceAction(visitId: string): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(visitId)) return { ok: false, error: 'billing.errors.visitNotFound' };

  return createInvoice(await createClient(), visitId);
}

export async function addInvoiceServiceAction(invoiceId: string, input: InvoiceServiceInput): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(invoiceId)) return NOT_FOUND;

  const parsed = invoiceServiceSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return addInvoiceService(await createClient(), invoiceId, parsed.data.service_id, parsed.data.qty);
}

export async function removeInvoiceItemAction(itemId: string): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(itemId)) return NOT_FOUND;

  return removeInvoiceItem(await createClient(), itemId);
}

export async function setItemDiscountAction(itemId: string, input: DiscountInput): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(itemId)) return NOT_FOUND;

  const parsed = discountSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return setItemDiscount(await createClient(), itemId, parsed.data);
}

export async function setInvoiceDiscountAction(invoiceId: string, input: DiscountInput): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(invoiceId)) return NOT_FOUND;

  const parsed = discountSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return setInvoiceDiscount(await createClient(), invoiceId, parsed.data);
}

/** `total` re-checks cash cover on the server; the database checks it again. BPJS invoices pass `null`. */
export async function payInvoiceAction(
  invoiceId: string,
  total: number,
  input: PaymentInput | null,
): Promise<ActionResult> {
  await requireRole(...CASHIER_ROLES);
  if (!isId(invoiceId)) return NOT_FOUND;
  if (input === null) return payInvoice(await createClient(), invoiceId, null);

  const parsed = paymentSchema(total).safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return payInvoice(await createClient(), invoiceId, parsed.data);
}

export async function setPackageItemsAction(packageId: string, input: PackageItemsInput): Promise<ActionResult> {
  await requireRole(...MANAGERS);
  if (!isId(packageId)) return NOT_FOUND;

  const parsed = packageItemsSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return setPackageItems(await createClient(), packageId, parsed.data);
}

export async function voidInvoiceAction(invoiceId: string, input: VoidValues): Promise<ActionResult> {
  await requireRole('owner', 'admin');
  if (!isId(invoiceId)) return NOT_FOUND;

  const parsed = voidSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return voidInvoice(await createClient(), invoiceId, parsed.data);
}
