// Governed by .rules v1.0
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { logisticsConfig } from '../config/logistics.js';
import { LogisticsWebhookService } from '../services/logistics/logistics-webhook.service.js';
import { ApiError } from '../utils/api-error.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

const secureEqual = (received: string, expected: string): boolean => {
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const LogisticsWebhookController = {
  receive: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const apiKey = req.headers['x-api-key'];
    if (!logisticsConfig.webhookSecret || typeof apiKey !== 'string' || !secureEqual(apiKey, logisticsConfig.webhookSecret)) {
      throw new ApiError(401, 'Invalid logistics webhook credentials');
    }
    const result = await LogisticsWebhookService.process(req.body);
    res.status(200).json(new ApiResponse(result, 'Logistics event accepted'));
  })
};
