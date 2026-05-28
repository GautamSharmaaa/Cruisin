// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { UploadService } from '../services/upload.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const UploadController = {
  signature: asyncHandler(async (req: Request, res: Response): Promise<void> => { const folder = typeof req.query.folder === 'string' ? req.query.folder : 'cruisin/products'; res.json(new ApiResponse(UploadService.signature(folder), 'Upload signature created')); })
};
