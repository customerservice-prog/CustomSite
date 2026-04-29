import type { Invoice } from '@/lib/types/entities';

export const invoicesSeed: Invoice[] = [];

/** Next invoice number from existing records (demo). */
export function nextInvoiceNumber(invoices: Record<string, Invoice>): string {
  let max = 1000;
  for (const inv of Object.values(invoices)) {
    const m = /^INV-(\d+)$/.exec(inv.number);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `INV-${max + 1}`;
}
