// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { UploadService } from '../services/upload.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';
import { ApiError } from '../utils/api-error.js';

export const UploadController = {
  signature: asyncHandler(async (req: Request, res: Response): Promise<void> => { const folder = typeof req.query.folder === 'string' ? req.query.folder : 'cruisin/products'; if (!/^cruisin\/[a-z0-9/_-]+$/i.test(folder)) throw new ApiError(400, 'Invalid upload folder'); res.json(new ApiResponse(UploadService.signature(folder), 'Upload signature created')); })
};
