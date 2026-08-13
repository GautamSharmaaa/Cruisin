// Governed by .rules v1.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/api.types';

export interface CustomerReturn {
  _id: string; requestNumber: string; order: string;
  items: Array<{ variant: string; sku: string; title: string; size?: string; color?: string; quantity: number }>;
  reason: string; details?: string; handlingFee: number;
  evidence?: Array<{ url: string; format: string }>;
  productRefundAmount?: number;
  handlingFeePaymentStatus: 'initializing' | 'pending' | 'paid' | 'failed'; status: string; pickupStatus?: string; refundStatus: string; latestUpdate?: string; createdAt: string; updatedAt: string;
  refundWindowOpenedAt?: string;
  refundDestination?: { method?: RefundMethod; verificationStatus?: 'not_submitted' | 'pending' | 'verified' | 'failed'; maskedDetails?: string; upiId?: string; registeredName?: string; submittedByRole?: 'customer' | 'admin' | 'superadmin'; submittedAt?: string; verifiedAt?: string };
  refundAvailableMethods?: RefundMethod[];
  refundUpiMode?: 'provider_verified' | 'manual_admin';
  manualTransferReference?: string;
  manualTransferredAt?: string;
}
export type RefundMethod = 'original_payment' | 'wallet' | 'upi' | 'bank';
export type RefundDestinationInput = { method: 'original_payment' } | { method: 'wallet' } | { method: 'upi'; upiId: string } | { method: 'bank'; accountHolderName: string; accountNumber: string; confirmAccountNumber: string; ifsc: string };
export interface CustomerWallet { id: string; currency: 'INR'; status: 'active' | 'locked'; availableBalance: number; totalCredited: number; totalDebited: number; entries: Array<{ id: string; operationId: string; direction: 'credit' | 'debit'; amount: number; sourceType: string; sourceReference: string; description: string; createdAt: string }> }
export interface ReturnEvidenceUpload { publicId: string; version: number; format: 'jpg' | 'jpeg' | 'png' | 'webp'; token: string; url: string; }
export interface ReturnPaymentSession {
  request: { id: string; requestNumber: string; status: string; handlingFee: number; handlingFeePaymentStatus: string };
  payment: { id: string; amount: number; currency: string; provider: 'razorpay' } | null;
}
export interface ExchangeOptionItem {
  variantId: string; productId: string; title: string; sku: string; size?: string; color?: string; quantity: number;
  alternatives: Array<{ id: string; size: string; color: string; colorHex: string; sku: string; price: number; stock: number; enabled: boolean }>;
}
export interface CustomerExchange { _id: string; requestNumber: string; status: string; requestedSku: string; createdAt: string; }
export interface ExchangePaymentSession { request: { id: string; requestNumber: string; status: string; handlingFee: number; handlingFeePaymentStatus: string }; payment: { id: string; amount: number; currency: string; provider: 'razorpay' } | null; }
export const useMyReturns = () => useQuery({ queryKey: ['returns', 'mine'], queryFn: async (): Promise<CustomerReturn[]> => (await api.get<ApiEnvelope<{ returns: CustomerReturn[] }>>('/fulfillment/mine')).data.data.returns });
export const useUploadReturnEvidence = () => useMutation({ mutationFn: async (file: File): Promise<ReturnEvidenceUpload> => { const form = new FormData(); form.append('photo', file); return (await api.post<ApiEnvelope<ReturnEvidenceUpload>>('/fulfillment/returns/evidence', form)).data.data; } });
export const useCreateReturn = () => useMutation({ mutationFn: async (input: { orderId: string; items: Array<{ variantId: string; quantity: number }>; reason: string; details?: string; evidence: Array<Omit<ReturnEvidenceUpload, 'url'>>; idempotencyKey: string }): Promise<ReturnPaymentSession> => (await api.post<ApiEnvelope<ReturnPaymentSession>>('/fulfillment/returns', input)).data.data });
export const useExchangeOptions = (orderId: string, enabled: boolean) => useQuery({ queryKey: ['exchanges', 'options', orderId], enabled: enabled && Boolean(orderId), queryFn: async (): Promise<ExchangeOptionItem[]> => (await api.get<ApiEnvelope<{ items: ExchangeOptionItem[] }>>(`/fulfillment/exchanges/options/${orderId}`)).data.data.items });
export const useCreateExchange = () => useMutation({ mutationFn: async (input: { orderId: string; variantId: string; requestedVariantId: string; quantity: number; idempotencyKey: string }): Promise<ExchangePaymentSession> => (await api.post<ApiEnvelope<ExchangePaymentSession>>('/fulfillment/exchanges', input)).data.data });
export const useVerifyExchangePayment = () => { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (input: { requestId: string; payload: Record<string, unknown> }): Promise<CustomerExchange> => (await api.post<ApiEnvelope<CustomerExchange>>('/fulfillment/exchanges/verify-payment', input)).data.data, onSuccess: async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ['returns', 'mine'] }); } }); };
export const useVerifyReturnPayment = () => { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (input: { requestId: string; payload: Record<string, unknown> }): Promise<CustomerReturn> => (await api.post<ApiEnvelope<CustomerReturn>>('/fulfillment/returns/verify-payment', input)).data.data, onSuccess: async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ['returns', 'mine'] }); } }); };
export const useCustomerWallet = () => useQuery({ queryKey: ['wallet', 'mine'], queryFn: async (): Promise<CustomerWallet> => (await api.get<ApiEnvelope<CustomerWallet>>('/fulfillment/wallet')).data.data });
export const useSubmitRefundDestination = () => { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (input: { requestId: string; destination: RefundDestinationInput }): Promise<CustomerReturn> => (await api.post<ApiEnvelope<CustomerReturn>>(`/fulfillment/returns/${input.requestId}/refund-destination`, input.destination)).data.data, onSuccess: async (): Promise<void> => { await Promise.all([queryClient.invalidateQueries({ queryKey: ['returns', 'mine'] }), queryClient.invalidateQueries({ queryKey: ['wallet', 'mine'] })]); } }); };
export const useRefreshRefundDestination = () => { const queryClient = useQueryClient(); return useMutation({ mutationFn: async (requestId: string): Promise<CustomerReturn> => (await api.post<ApiEnvelope<CustomerReturn>>(`/fulfillment/returns/${requestId}/refund-destination/refresh`, {})).data.data, onSuccess: async (): Promise<void> => { await queryClient.invalidateQueries({ queryKey: ['returns', 'mine'] }); } }); };
