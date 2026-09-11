// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { InvoiceService, type InvoiceFilters, type InvoiceSettingsValue } from '../services/invoice.service.js';
import { renderInvoicePdf } from '../services/invoice-pdf.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { logger } from '../utils/logger.js';

const safeFilename = (value: string): string => value.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-');
const listFilters = (value: Record<string, unknown>): InvoiceFilters => value as InvoiceFilters;
const exportFilename = (filters?: InvoiceFilters): string => {
  if (filters?.startDate && filters.endDate) {
    const display = (date: string): string =>
      new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      })
        .format(new Date(`${date}T12:00:00+05:30`))
        .replaceAll(' ', '-');
    return safeFilename(`Cruisin-Invoices-${display(filters.startDate)}-to-${display(filters.endDate)}.pdf`);
  }
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return `Cruisin-Invoices-${today}.pdf`;
};

export const InvoiceController = {
  list: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await InvoiceService.list(listFilters(req.query));
    res.json(new ApiResponse(result, 'Invoices loaded'));
  }),
  byId: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const invoice = await InvoiceService.byId(String(req.params.id ?? ''));
    res.json(new ApiResponse(invoice, 'Invoice loaded'));
  }),
  pdf: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const started = Date.now();
    const invoice = await InvoiceService.byId(String(req.params.id ?? ''));
    const pdf = await renderInvoicePdf([invoice]);
    const filename = safeFilename(`${String(invoice.invoiceNumber)}.pdf`);
    let downloadRecorded = true;
    try {
      await InvoiceService.recordDownloaded([String(invoice._id)], req.user?.userId, 'single');
    } catch (error) {
      downloadRecorded = false;
      logger.error('Invoice download status could not be recorded', {
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        error,
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Invoice-Download-Recorded', downloadRecorded ? 'true' : 'false');
    res.setHeader('Content-Length', String(pdf.length));
    res.send(pdf);
    logger.info('Single invoice PDF generated', {
      invoiceId: String(invoice._id),
      invoiceNumber: invoice.invoiceNumber,
      durationMs: Date.now() - started,
    });
  }),
  bulkPdf: asyncHandler(async (req: Request<Record<string, string>, unknown, { invoiceIds?: string[]; selectAll?: boolean; filters?: InvoiceFilters }>, res: Response): Promise<void> => {
    const started = Date.now();
    const invoices = await InvoiceService.selected(req.body);
    const pdf = await renderInvoicePdf(invoices);
    const filename = exportFilename(req.body.filters);
    let downloadRecorded = true;
    try {
      await InvoiceService.recordDownloaded(
        invoices.map((invoice) => String(invoice._id)),
        req.user?.userId,
        'bulk',
      );
    } catch (error) {
      downloadRecorded = false;
      logger.error('Bulk invoice download status could not be recorded', {
        bulkCount: invoices.length,
        error,
      });
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Invoice-Download-Recorded', downloadRecorded ? 'true' : 'false');
    res.setHeader('Content-Length', String(pdf.length));
    res.send(pdf);
    logger.info('Bulk invoice PDF generated', {
      bulkCount: invoices.length,
      durationMs: Date.now() - started,
    });
  }),
  settings: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await InvoiceService.getSettings(), 'Invoice settings loaded'));
  }),
  saveSettings: asyncHandler(async (req: Request<Record<string, string>, unknown, InvoiceSettingsValue>, res: Response): Promise<void> => {
    res.json(new ApiResponse(await InvoiceService.saveSettings(req.body), 'Invoice settings saved for future invoices'));
  }),
  sync: asyncHandler(async (req: Request<Record<string, string>, unknown, { limit?: number }>, res: Response): Promise<void> => {
    res.json(new ApiResponse(await InvoiceService.syncEligibleOrders(req.body.limit ?? 3), 'Eligible delivered orders synchronized with invoices'));
  }),
};
