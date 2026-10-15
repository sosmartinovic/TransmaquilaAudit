export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runAudit, type ExtractionResult } from '@/lib/matching-engine';
import fs from 'fs';
import path from 'path';

const EXTRACTION_PROMPT = `You are analyzing a freight/logistics invoice from a Mexican or US carrier. The invoice may be in Spanish or English.

Extract the following fields from this invoice and respond in JSON format:
{
  "carrier_name": "The name of the carrier or transport company",
  "invoice_number": "The invoice number or folio",
  "load_reference": "The load reference number - look for: Load #, Referencia de Carga, Carga ID, Número de Embarque, BOL, Embarque, No. Carga, TRQ-XXXX format",
  "invoice_date": "Invoice date in YYYY-MM-DD format",
  "total_amount": 0.00,
  "currency": "USD or MXN",
  "confidence_notes": "Any notes about extraction confidence or ambiguity"
}

IMPORTANT:
- total_amount must be a number (no currency symbols)
- currency must be exactly "USD" or "MXN"
- load_reference is critical - look carefully for TRQ-XXXX patterns
- invoice_date must be YYYY-MM-DD format
- Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

async function extractInvoice(filename: string): Promise<ExtractionResult> {
  const pdfPath = path.join(process.cwd(), 'public', 'facturas', filename);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const base64String = pdfBuffer.toString('base64');

  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    throw new Error('ABACUSAI_API_KEY is not configured');
  }

  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gemini-3.8-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'file',
              file: {
                filename: filename,
                file_data: `data:application/pdf;base64,${base64String}`,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? '{}';

  try {
    const parsed = JSON.parse(content);
    return {
      carrier_name: parsed?.carrier_name ?? null,
      invoice_number: parsed?.invoice_number ?? null,
      load_reference: parsed?.load_reference ?? null,
      invoice_date: parsed?.invoice_date ?? null,
      total_amount: parsed?.total_amount != null ? Number(parsed.total_amount) : null,
      currency: parsed?.currency ?? null,
      confidence_notes: parsed?.confidence_notes ?? null,
    };
  } catch {
    throw new Error(`Failed to parse LLM response: ${content}`);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const forceReprocess = (body as any)?.force === true;

  const facturasDir = path.join(process.cwd(), 'public', 'facturas');
  let files: string[] = [];
  try {
    files = fs.readdirSync(facturasDir).filter((f: string) => f.endsWith('.pdf')).sort();
  } catch {
    return new Response(JSON.stringify({ error: 'Could not read facturas directory' }), { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (eventData: Record<string, any>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
      };

      try {
        sendEvent({ status: 'started', total: files.length });

        // Phase 1: Extract all invoices
        const allExtractions: { filename: string; extraction: ExtractionResult }[] = [];

        for (let i = 0; i < files.length; i++) {
          const filename = files[i] ?? '';
          sendEvent({
            status: 'processing',
            index: i,
            total: files.length,
            filename,
            phase: 'extraction',
            message: `Extracting ${filename}...`,
          });

          try {
            // Check cache
            if (!forceReprocess) {
              const existing = await prisma.invoiceResult.findUnique({ where: { filename } });
              if (existing?.processedAt) {
                const cachedExtraction: ExtractionResult = {
                  carrier_name: existing.carrierName,
                  invoice_number: existing.invoiceNumber,
                  load_reference: existing.loadReference,
                  invoice_date: existing.invoiceDate,
                  total_amount: existing.totalAmount,
                  currency: existing.currency,
                  confidence_notes: existing.confidenceNotes,
                };
                allExtractions.push({ filename, extraction: cachedExtraction });
                sendEvent({
                  status: 'extracted',
                  index: i,
                  filename,
                  cached: true,
                  message: `${filename} — loaded from cache`,
                });
                continue;
              }
            }

            const extraction = await extractInvoice(filename);
            allExtractions.push({ filename, extraction });

            sendEvent({
              status: 'extracted',
              index: i,
              filename,
              cached: false,
              carrier: extraction.carrier_name,
              invoiceNumber: extraction.invoice_number,
              message: `${filename} — extracted successfully`,
            });
          } catch (err: any) {
            const fallbackExtraction: ExtractionResult = {
              carrier_name: null,
              invoice_number: null,
              load_reference: null,
              invoice_date: null,
              total_amount: null,
              currency: null,
              confidence_notes: `Extraction failed: ${err?.message ?? 'Unknown error'}`,
            };
            allExtractions.push({ filename, extraction: fallbackExtraction });

            sendEvent({
              status: 'extraction_error',
              index: i,
              filename,
              error: err?.message ?? 'Unknown error',
              message: `${filename} — extraction failed`,
            });
          }
        }

        // Phase 2: Collect all invoice numbers for duplicate detection
        const allInvoiceNumbers = allExtractions
          .map((e: { filename: string; extraction: ExtractionResult }) => e.extraction.invoice_number)
          .filter((n: string | null): n is string => n != null && n !== '');

        // Phase 3: Run audit on all
        sendEvent({ status: 'auditing', message: 'Running audit matching...' });

        for (let i = 0; i < allExtractions.length; i++) {
          const item = allExtractions[i];
          if (!item) continue;
          const { filename, extraction } = item;

          const audit = runAudit(extraction, allInvoiceNumbers);

          await prisma.invoiceResult.upsert({
            where: { filename },
            update: {
              carrierName: extraction.carrier_name,
              invoiceNumber: extraction.invoice_number,
              loadReference: extraction.load_reference,
              invoiceDate: extraction.invoice_date,
              totalAmount: extraction.total_amount,
              currency: extraction.currency,
              confidenceNotes: extraction.confidence_notes,
              status: audit.status,
              exceptions: JSON.stringify(audit.exceptions),
              expectedAmount: audit.expectedAmount,
              expectedCurrency: audit.expectedCurrency,
              discrepancy: audit.discrepancy,
              matchedLoadId: audit.matchedLoad?.load_id ?? null,
              matchedOrigin: audit.matchedLoad?.origin ?? null,
              matchedDest: audit.matchedLoad?.destination ?? null,
              matchedCommodity: audit.matchedLoad?.commodity ?? null,
              processedAt: new Date(),
            },
            create: {
              filename,
              carrierName: extraction.carrier_name,
              invoiceNumber: extraction.invoice_number,
              loadReference: extraction.load_reference,
              invoiceDate: extraction.invoice_date,
              totalAmount: extraction.total_amount,
              currency: extraction.currency,
              confidenceNotes: extraction.confidence_notes,
              status: audit.status,
              exceptions: JSON.stringify(audit.exceptions),
              expectedAmount: audit.expectedAmount,
              expectedCurrency: audit.expectedCurrency,
              discrepancy: audit.discrepancy,
              matchedLoadId: audit.matchedLoad?.load_id ?? null,
              matchedOrigin: audit.matchedLoad?.origin ?? null,
              matchedDest: audit.matchedLoad?.destination ?? null,
              matchedCommodity: audit.matchedLoad?.commodity ?? null,
              processedAt: new Date(),
            },
          });

          sendEvent({
            status: 'audited',
            index: i,
            filename,
            auditStatus: audit.status,
            exceptionCount: audit.exceptions.length,
            message: `${filename} — ${audit.status}`,
          });
        }

        sendEvent({ status: 'completed', message: 'All invoices processed successfully.' });
      } catch (err: any) {
        sendEvent({ status: 'error', message: err?.message ?? 'Processing failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
