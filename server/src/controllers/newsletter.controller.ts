// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { NewsletterService } from '../services/newsletter.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const NewsletterController = {
  subscribe: asyncHandler(async (req: Request<Record<string, string>, unknown, { email: string; source?: string; consent?: boolean }>, res: Response): Promise<void> => {
    const result = await NewsletterService.subscribe({
      ...req.body,
      userAgent: req.get('user-agent') ?? '',
      ip: req.ip
    });
    res.status(result.duplicate ? 200 : 201).json(new ApiResponse(result, result.duplicate ? 'You are already on the list.' : 'You are on the list.'));
  })
};
