// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const AdminController = {
  overview: asyncHandler(async (_req: Request, res: Response): Promise<void> => { const overview = await AdminService.overview(); res.json(new ApiResponse(overview, 'Overview loaded')); })
};
