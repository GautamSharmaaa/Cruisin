// Governed by .rules v1.0
import crypto from 'node:crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import { ApiError } from '../utils/api-error.js';

export type AlternateRefundMethod = 'upi' | 'bank';
export type AlternateRefundDestination =
  | { method: 'upi'; upiId: string }
  | { method: 'bank'; accountHolderName: string; accountNumber: string; ifsc: string };

interface CustomerIdentity { id: string; name: string; email?: string; phone?: string; }
interface ValidationResult {
  validationId: string;
  fundAccountId?: string;
  status: 'pending' | 'verified' | 'failed';
  registeredName?: string;
}

type ProviderRecord = Record<string, unknown>;
const record = (value: unknown): ProviderRecord => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as ProviderRecord : {};
const string = (value: unknown): string | undefined => typeof value === 'string' && value.length ? value : undefined;
const isLocalMock = (): boolean => env.APP_ENV === 'development' && (env.RAZORPAY_KEY_ID.includes('mock') || env.RAZORPAY_KEY_SECRET.includes('mock'));
const auth = () => ({ username: env.RAZORPAY_KEY_ID, password: env.RAZORPAY_KEY_SECRET });
const providerError = (error: unknown, fallback: string): ApiError => {
  const data = axios.isAxiosError(error) ? record(error.response?.data) : {};
  const description = string(record(data.error).description);
  return new ApiError(axios.isAxiosError(error) && error.response?.status && error.response.status < 500 ? 400 : 502, description ?? fallback);
};
const validation = (value: unknown): ValidationResult => {
  const response = record(value);
  const results = record(response.validation_results);
  const fundAccount = record(response.fund_account);
  const accountStatus = String(results.account_status ?? results.status ?? fundAccount.active ?? '').toLowerCase();
  const rawStatus = String(response.status ?? '').toLowerCase();
  const status = rawStatus === 'failed' || ['invalid', 'inactive', 'failed'].includes(accountStatus)
    ? 'failed'
    : rawStatus === 'completed' && (['active', 'valid', 'true'].includes(accountStatus) || Boolean(results.registered_name))
      ? 'verified'
      : 'pending';
  const validationId = string(response.id);
  if (!validationId) throw new ApiError(502, 'RazorpayX returned an invalid validation response');
  return {
    validationId,
    fundAccountId: string(fundAccount.id),
    status,
    registeredName: string(results.registered_name)
  };
};

export const RazorpayXPayoutService = {
  available(): boolean {
    return env.RAZORPAYX_ENABLED && Boolean(env.RAZORPAYX_ACCOUNT_NUMBER);
  },

  async validateDestination(identity: CustomerIdentity, destination: AlternateRefundDestination, reference: string): Promise<ValidationResult> {
    if (!this.available()) throw new ApiError(503, 'Verified bank and UPI refunds are not configured');
    if (isLocalMock()) return { validationId: `fav_mock_${crypto.randomUUID().slice(0, 16)}`, fundAccountId: `fa_mock_${crypto.randomUUID().slice(0, 16)}`, status: 'verified', registeredName: identity.name };
    const fundAccount = destination.method === 'upi'
      ? { account_type: 'vpa', vpa: { address: destination.upiId } }
      : { account_type: 'bank_account', bank_account: { name: destination.accountHolderName, ifsc: destination.ifsc, account_number: destination.accountNumber } };
    try {
      const response = await axios.post('https://api.razorpay.com/v1/fund_accounts/validations', {
        source_account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
        validation_type: 'pennydrop',
        reference_id: reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40),
        notes: { purpose: 'cruisin_return_refund' },
        fund_account: {
          ...fundAccount,
          contact: {
            name: identity.name.slice(0, 100),
            ...(identity.email ? { email: identity.email } : {}),
            ...(identity.phone ? { contact: identity.phone } : {}),
            type: 'customer',
            reference_id: identity.id.slice(0, 40)
          }
        }
      }, { auth: auth(), headers: { 'Content-Type': 'application/json' }, timeout: 15_000 });
      return validation(response.data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error, 'Bank or UPI verification is temporarily unavailable');
    }
  },

  async refreshValidation(validationId: string): Promise<ValidationResult> {
    if (!this.available()) throw new ApiError(503, 'Verified bank and UPI refunds are not configured');
    if (validationId.startsWith('fav_mock_')) return { validationId, fundAccountId: validationId.replace('fav_', 'fa_'), status: 'verified', registeredName: 'Local test customer' };
    try {
      const response = await axios.get(`https://api.razorpay.com/v1/fund_accounts/validations/${encodeURIComponent(validationId)}`, { auth: auth(), timeout: 15_000 });
      return validation(response.data);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error, 'Refund destination verification status is unavailable');
    }
  },

  async payout(input: { fundAccountId: string; method: AlternateRefundMethod; amount: number; idempotencyKey: string; reference: string }): Promise<{ id: string; status: string }> {
    if (!this.available()) throw new ApiError(503, 'Verified bank and UPI refunds are not configured');
    const amount = Math.round((input.amount + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) throw new ApiError(400, 'Payout amount must be at least ₹1');
    if (input.fundAccountId.startsWith('fa_mock_')) return { id: `pout_mock_${crypto.randomUUID().slice(0, 16)}`, status: 'processed' };
    try {
      const response = await axios.post('https://api.razorpay.com/v1/payouts', {
        account_number: env.RAZORPAYX_ACCOUNT_NUMBER,
        fund_account_id: input.fundAccountId,
        amount,
        currency: 'INR',
        mode: input.method === 'upi' ? 'UPI' : 'IMPS',
        purpose: 'refund',
        queue_if_low_balance: false,
        reference_id: input.reference.slice(0, 40),
        narration: 'Cruisin return refund'
      }, { auth: auth(), headers: { 'Content-Type': 'application/json', 'X-Payout-Idempotency': input.idempotencyKey }, timeout: 15_000 });
      const data = record(response.data);
      const id = string(data.id);
      const status = string(data.status);
      if (!id || !status) throw new ApiError(502, 'RazorpayX returned an invalid payout response');
      return { id, status };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error, 'Bank or UPI payout is temporarily unavailable');
    }
  },

  async fetchPayout(payoutId: string): Promise<{ id: string; status: string }> {
    if (!this.available()) throw new ApiError(503, 'Verified bank and UPI refunds are not configured');
    if (payoutId.startsWith('pout_mock_')) return { id: payoutId, status: 'processed' };
    try {
      const response = await axios.get(`https://api.razorpay.com/v1/payouts/${encodeURIComponent(payoutId)}`, { auth: auth(), timeout: 15_000 });
      const data = record(response.data);
      const id = string(data.id);
      const status = string(data.status);
      if (!id || !status) throw new ApiError(502, 'RazorpayX returned an invalid payout response');
      return { id, status };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw providerError(error, 'Payout status is temporarily unavailable');
    }
  }
};
