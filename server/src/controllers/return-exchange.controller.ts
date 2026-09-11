// Governed by .rules v1.0
import type { Request, Response } from 'express';
import { ReturnExchangeService } from '../services/logistics/return-exchange.service.js';
import { UploadService } from '../services/upload.service.js';
import { ApiResponse } from '../utils/api-response.js';
import { asyncHandler } from '../utils/async-handler.js';

export const ReturnExchangeController = {
  uploadEvidence: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(new ApiResponse(await UploadService.uploadReturnEvidence(req.file, req.user?.userId ?? ''), 'Return photo uploaded'));
  }),
  createReturn: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(new ApiResponse(await ReturnExchangeService.createReturn(req.user?.userId ?? '', req.body), 'Return payment initialized'));
  }),
  verifyReturnPayment: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.verifyReturnPayment(req.user?.userId ?? '', req.body), 'Return payment verified and request submitted'));
  }),
  submitRefundDestination: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.submitRefundDestination(req.user?.userId ?? '', String(req.params.id ?? ''), req.body), 'Refund destination submitted'));
  }),
  setRefundDestinationByAdmin: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.setRefundDestinationByAdmin(String(req.params.id ?? ''), req.body, req.user?.userId ?? '', req.user?.role === 'superadmin' ? 'superadmin' : 'admin'), 'Customer refund destination updated'));
  }),
  refreshRefundDestination: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.refreshRefundDestination(req.user?.userId ?? '', String(req.params.id ?? '')), 'Refund destination verification refreshed'));
  }),
  wallet: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.wallet(req.user?.userId ?? ''), 'Cruisin Wallet loaded'));
  }),
  createExchange: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(new ApiResponse(await ReturnExchangeService.createExchange(req.user?.userId ?? '', req.body), 'Exchange requested'));
  }),
  verifyExchangePayment: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.verifyExchangePayment(req.user?.userId ?? '', req.body), 'Exchange payment verified and request submitted'));
  }),
  exchangeOptions: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.exchangeOptions(req.user?.userId ?? '', String(req.params.id ?? '')), 'Exchange options loaded'));
  }),
  mine: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.mine(req.user?.userId ?? ''), 'Return and exchange requests loaded'));
  }),
  returns: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.json(new ApiResponse(await ReturnExchangeService.listReturns(req.user?.role ?? 'viewer'), 'Returns loaded'));
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
