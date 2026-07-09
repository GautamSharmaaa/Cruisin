// Governed by .rules v1.0
import type { Request, Response } from 'express';
import multer from 'multer';
import { CatalogueExportService } from '../services/catalogueExport.service.js';
import { CatalogueHistoryService } from '../services/catalogueHistory.service.js';
import { CatalogueImportService } from '../services/catalogueImport.service.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const catalogueCsvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback): void => {
    const ok = file.originalname.toLowerCase().endsWith('.csv') || ['text/csv', 'application/vnd.ms-excel', 'application/csv'].includes(file.mimetype);
    if (!ok) {
      callback(new ApiError(400, 'Only CSV catalogue files are allowed'));
      return;
    }
    callback(null, true);
  }
});

const csvFromRequest = (req: Request): string => {
  const file = req.file as Express.Multer.File | undefined;
  if (file) return file.buffer.toString('utf8');
  if (typeof req.body.csv === 'string') return req.body.csv;
  return '';
};

const filenameFromRequest = (req: Request): string => {
  const file = req.file as Express.Multer.File | undefined;
  return file?.originalname ?? String(req.body.filename ?? 'catalogue.csv');
};

export const CatalogueController = {
  dashboard: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const dashboard = await CatalogueHistoryService.dashboard();
    res.json(new ApiResponse(dashboard, 'Catalogue dashboard loaded'));
  }),
  upload: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const file = req.file as Express.Multer.File | undefined;
    const result = await CatalogueImportService.upload({
      csv: csvFromRequest(req),
      filename: filenameFromRequest(req),
      originalFilename: filenameFromRequest(req),
      fileSize: file?.size ?? Buffer.byteLength(csvFromRequest(req)),
      uploadedBy: req.user?.userId,
      delimiter: typeof req.body.delimiter === 'string' ? req.body.delimiter : undefined
    });
    res.status(201).json(new ApiResponse(result, 'Catalogue uploaded and previewed'));
  }),
  preview: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await CatalogueImportService.preview({ ...req.body, csv: csvFromRequest(req) || undefined });
    res.json(new ApiResponse(result, 'Catalogue preview loaded'));
  }),
  dryRun: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await CatalogueImportService.dryRun(req.body);
    res.json(new ApiResponse(result, 'Catalogue dry run complete'));
  }),
  confirm: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await CatalogueImportService.confirm({ ...req.body, uploadedBy: req.user?.userId });
    res.json(new ApiResponse(result, 'Catalogue imported'));
  }),
  imports: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const imports = await CatalogueHistoryService.imports();
    res.json(new ApiResponse(imports, 'Catalogue imports loaded'));
  }),
  importById: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const item = await CatalogueHistoryService.importById(String(req.params.id ?? ''));
    res.json(new ApiResponse(item, 'Catalogue import loaded'));
  }),
  importErrors: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const csv = await CatalogueImportService.errorReport(String(req.params.id ?? ''));
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="catalogue-import-errors.csv"');
    res.send(csv);
  }),
  exportCatalogue: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await CatalogueExportService.generate({ ...req.body, generatedBy: req.user?.userId });
    res.status(201).json(new ApiResponse(result, 'Catalogue export generated'));
  }),
  exports: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const exports = await CatalogueHistoryService.exports();
    res.json(new ApiResponse(exports, 'Catalogue exports loaded'));
  }),
  exportDownload: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const file = await CatalogueExportService.download(String(req.params.id ?? ''));
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="' + file.filename + '"');
    res.send(file.csv);
  }),
  settings: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    const settings = await CatalogueHistoryService.settings();
    res.json(new ApiResponse(settings, 'Catalogue settings loaded'));
  }),
  updateSettings: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const settings = await CatalogueHistoryService.updateSettings(req.body);
    res.json(new ApiResponse(settings, 'Catalogue settings saved'));
  })
};
