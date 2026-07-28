// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { ReturnExchangeService } from '../services/logistics/return-exchange.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ReturnExchangeController = {
  createReturn: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(new ApiResponse(await ReturnExchangeService.createReturn(req.user?.userId ?? '', req.body), 'Return requested'));
  }),
  createExchange: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(new ApiResponse(await ReturnExchangeService.createExchange(req.user?.userId ?? '', req.body), 'Exchange requested'));
  }),
  mine: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.mine(req.user?.userId ?? ''), 'Return and exchange requests loaded'));
  }),
  returns: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.listReturns(), 'Returns loaded'));
  }),
  exchanges: asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.listExchanges(), 'Exchanges loaded'));
  }),
  returnAction: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.actOnReturn(String(req.params.id ?? ''), req.body, req.user?.userId ?? ''), 'Return updated'));
  }),
  exchangeAction: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.actOnExchange(String(req.params.id ?? ''), req.body, req.user?.userId ?? ''), 'Exchange updated'));
  })
};
