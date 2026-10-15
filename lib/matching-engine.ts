import { findMatchingLoad, type LoadRecord } from './load-register';

export interface ExtractionResult {
  carrier_name: string | null;
  invoice_number: string | null;
  load_reference: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  currency: string | null;
  confidence_notes: string | null;
}

export interface AuditException {
  type: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface AuditResult {
  status: 'APPROVED' | 'FLAGGED_FOR_REVIEW';
  exceptions: AuditException[];
  matchedLoad: LoadRecord | null;
  expectedAmount: number | null;
  expectedCurrency: string | null;
  discrepancy: number | null;
}

export function runAudit(
  extraction: ExtractionResult,
  allInvoiceNumbers: string[]
): AuditResult {
  const exceptions: AuditException[] = [];
  let matchedLoad: LoadRecord | null = null;
  let expectedAmount: number | null = null;
  let expectedCurrency: string | null = null;
  let discrepancy: number | null = null;

  // 1. Check load reference present
  if (!extraction.load_reference || extraction.load_reference.trim() === '') {
    exceptions.push({
      type: 'MISSING_LOAD_REFERENCE',
      message: 'No load reference was found on the invoice.',
      severity: 'error',
    });
  } else {
    // 2. Try to match load
    matchedLoad = findMatchingLoad(extraction.load_reference);
    if (!matchedLoad) {
      exceptions.push({
        type: 'LOAD_NOT_FOUND_IN_REGISTER',
        message: `Load reference "${extraction.load_reference}" was not found in the load register.`,
        severity: 'error',
      });
    }
  }

  // 3. Check total amount present
  if (extraction.total_amount == null || isNaN(extraction.total_amount)) {
    exceptions.push({
      type: 'MISSING_TOTAL_AMOUNT',
      message: 'Total amount could not be extracted from the invoice.',
      severity: 'error',
    });
  }

  // 4. Check currency
  const normCurrency = (extraction.currency ?? '').toUpperCase().trim();
  if (!normCurrency || (normCurrency !== 'USD' && normCurrency !== 'MXN')) {
    exceptions.push({
      type: 'UNVERIFIED_CURRENCY',
      message: `Currency "${extraction.currency ?? 'unknown'}" could not be verified as USD or MXN.`,
      severity: 'warning',
    });
  }

  // 5. If matched, check currency and rate
  if (matchedLoad) {
    expectedAmount = matchedLoad.agreed_rate;
    expectedCurrency = matchedLoad.currency;

    if (normCurrency && expectedCurrency && normCurrency !== expectedCurrency) {
      exceptions.push({
        type: 'CURRENCY_MISMATCH',
        message: `Invoice currency ${normCurrency} does not match expected ${expectedCurrency}.`,
        severity: 'error',
      });
    }

    if (extraction.total_amount != null && expectedAmount != null) {
      const diff = extraction.total_amount - expectedAmount;
      if (Math.abs(diff) > 0.01) {
        discrepancy = diff;
        exceptions.push({
          type: 'RATE_DISCREPANCY',
          message: `Invoiced amount ${extraction.total_amount.toFixed(2)} differs from agreed rate ${expectedAmount.toFixed(2)} by ${diff > 0 ? '+' : ''}${diff.toFixed(2)} ${normCurrency || expectedCurrency}.`,
          severity: 'error',
        });
      }
    }
  }

  // 6. Check duplicate invoice number
  if (extraction.invoice_number) {
    const dupeCount = allInvoiceNumbers.filter(
      (n: string) => n === extraction.invoice_number
    ).length;
    if (dupeCount > 1) {
      exceptions.push({
        type: 'DUPLICATE_INVOICE',
        message: `Invoice number "${extraction.invoice_number}" appears ${dupeCount} times.`,
        severity: 'error',
      });
    }
  }

  const status = exceptions.length === 0 ? 'APPROVED' : 'FLAGGED_FOR_REVIEW';

  return { status, exceptions, matchedLoad, expectedAmount, expectedCurrency, discrepancy };
}
