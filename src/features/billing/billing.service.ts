import 'server-only';
import { masterDataErrorMessage } from '@/features/settings/settings.lib';
import { todayInJakarta } from '@/lib/dates';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import {
  billingErrorMessage,
  type DiscountValues,
  type PackageItemsValues,
  type PaymentValues,
  type ServiceValues,
  type VoidValues,
} from './billing.lib';

const DUPLICATE_SERVICE = 'Nama layanan ini sudah ada. Gunakan nama lain.';

export async function listServices(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('services')
    .select(
      'id, name, type, price, doctor_fee_type, doctor_fee_value, is_active, contents:service_package_items!service_package_items_package_id_fkey(service_id, qty, service:services!service_package_items_service_id_fkey(name))',
    )
    .order('is_active', { ascending: false })
    .order('type')
    .order('name');

  if (error) throw new Error(`listServices failed: ${error.code}`);

  return data;
}

export async function createService(supabase: SupabaseClient, values: ServiceValues): Promise<ActionResult> {
  const { error } = await supabase.from('services').insert(values);

  return error ? { ok: false, error: masterDataErrorMessage(error, DUPLICATE_SERVICE) } : { ok: true, data: undefined };
}

export async function updateService(
  supabase: SupabaseClient,
  serviceId: string,
  values: Partial<ServiceValues> & { is_active?: boolean },
): Promise<ActionResult> {
  const { data, error } = await supabase.from('services').update(values).eq('id', serviceId).select('id').maybeSingle();

  if (error) return { ok: false, error: masterDataErrorMessage(error, DUPLICATE_SERVICE) };

  return data ? { ok: true, data: undefined } : { ok: false, error: 'Layanan tidak ditemukan. Muat ulang halaman.' };
}

// Invoices ------------------------------------------------------------------------

const VISIT_SELECT =
  'id, status, queue_no, payer_type, updated_at, patient:patients(id, full_name, mrn, sex, birth_date), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name)';

/** Visits waiting at the cashier, oldest first. */
export async function listCashierQueue(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('visits')
    .select(VISIT_SELECT)
    .eq('status', 'to_cashier')
    .order('updated_at');

  if (error) throw new Error(`listCashierQueue failed: ${error.code}`);

  return data;
}

/** Invoices paid today, newest first. */
export async function listPaidToday(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, total, payer_type, paid_at, visit:visits(id, patient:patients(full_name))')
    .eq('status', 'paid')
    .gte('paid_at', `${todayInJakarta()}T00:00:00+07:00`)
    .order('paid_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`listPaidToday failed: ${error.code}`);

  return data;
}

export async function getCashierVisit(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase.from('visits').select(VISIT_SELECT).eq('id', visitId).maybeSingle();

  if (error) throw new Error(`getCashierVisit failed: ${error.code}`);

  return data;
}

const INVOICE_SELECT =
  'id, invoice_no, payer_type, status, subtotal, item_discount, discount, discount_reason, total, paid_at, created_at, cashier:profiles!invoices_paid_by_fkey(full_name), items:invoice_items(id, item_type, description, qty, unit_price, discount, discount_reason, amount, created_at), payments(id, method, amount, cash_received, change, reference, created_at)';

/** The visit's live (not voided) invoice. */
export async function getVisitInvoice(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('visit_id', visitId)
    .neq('status', 'void')
    .order('created_at', { referencedTable: 'invoice_items' })
    .maybeSingle();

  if (error) throw new Error(`getVisitInvoice failed: ${error.code}`);

  return data;
}

export async function getInvoice(supabase: SupabaseClient, invoiceId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `${INVOICE_SELECT}, visit:visits(queue_no, patient:patients(full_name, mrn), poli:polis(name), doctor:profiles!visits_doctor_id_fkey(full_name))`,
    )
    .eq('id', invoiceId)
    .order('created_at', { referencedTable: 'invoice_items' })
    .maybeSingle();

  if (error) throw new Error(`getInvoice failed: ${error.code}`);

  return data;
}

/** Active services the cashier may add (consultation, procedures, other). */
export async function listBillableServices(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('services').select('id, name, price').eq('is_active', true).order('name');

  if (error) throw new Error(`listBillableServices failed: ${error.code}`);

  return data;
}

const billingResult = (error: { code?: string; message?: string } | null): ActionResult =>
  error ? { ok: false, error: billingErrorMessage(error) } : { ok: true, data: undefined };

export async function createInvoice(supabase: SupabaseClient, visitId: string) {
  const { error } = await supabase.rpc('create_invoice', { p_visit_id: visitId });

  return billingResult(error);
}

export async function addInvoiceService(supabase: SupabaseClient, invoiceId: string, serviceId: string, qty: number) {
  const { error } = await supabase.rpc('add_invoice_service', {
    p_invoice_id: invoiceId,
    p_service_id: serviceId,
    p_qty: qty,
  });

  return billingResult(error);
}

export async function removeInvoiceItem(supabase: SupabaseClient, itemId: string) {
  const { error } = await supabase.rpc('remove_invoice_item', { p_item_id: itemId });

  return billingResult(error);
}

export async function setItemDiscount(supabase: SupabaseClient, itemId: string, values: DiscountValues) {
  const { error } = await supabase.rpc('set_item_discount', {
    p_item_id: itemId,
    p_discount: values.amount,
    p_reason: values.reason,
  });

  return billingResult(error);
}

export async function setInvoiceDiscount(supabase: SupabaseClient, invoiceId: string, values: DiscountValues) {
  const { error } = await supabase.rpc('set_invoice_discount', {
    p_invoice_id: invoiceId,
    p_discount: values.amount,
    p_reason: values.reason,
  });

  return billingResult(error);
}

/** Pays (umum) or closes (BPJS, no payment); the visit becomes done and integration jobs are queued. */
export async function payInvoice(supabase: SupabaseClient, invoiceId: string, values: PaymentValues | null) {
  const { error } = await supabase.rpc('pay_invoice', {
    p_invoice_id: invoiceId,
    p_method: values?.method ?? '',
    p_cash_received: values?.cash_received ?? 0,
    p_reference: values?.reference ?? '',
  });

  return billingResult(error);
}

export async function setPackageItems(supabase: SupabaseClient, packageId: string, values: PackageItemsValues) {
  const { error } = await supabase.rpc('set_package_items', { p_package_id: packageId, p_items: values.items });

  return billingResult(error);
}

/** Owner/admin: the visit returns to the cashier for a corrected invoice. */
export async function voidInvoice(supabase: SupabaseClient, invoiceId: string, values: VoidValues) {
  const { error } = await supabase.rpc('void_invoice', { p_invoice_id: invoiceId, p_reason: values.reason });

  return billingResult(error);
}

export async function listVoidedInvoices(supabase: SupabaseClient, visitId: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_no, total, void_reason, voided_at, voider:profiles!invoices_voided_by_fkey(full_name)')
    .eq('visit_id', visitId)
    .eq('status', 'void')
    .order('voided_at', { ascending: false });

  if (error) throw new Error(`listVoidedInvoices failed: ${error.code}`);

  return data;
}
