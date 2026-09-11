// Governed by .rules v1.0
import { Types } from 'mongoose';
import { WalletModel, type WalletDocument } from '../models/wallet.model.js';
import { ApiError } from '../utils/api-error.js';

type WalletSourceType = 'return_refund' | 'membership_credit' | 'order_payment' | 'admin_adjustment';
interface WalletOperation {
  customerId: string;
  amount: number;
  operationId: string;
  sourceType: WalletSourceType;
  sourceReference: string;
  description: string;
  createdBy?: string;
}

const objectId = (value: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(value)) throw new ApiError(400, 'Invalid wallet identifier');
  return new Types.ObjectId(value);
};
const paise = (amount: number): number => {
  const result = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(result) || result < 1) throw new ApiError(400, 'Wallet amount must be at least ₹0.01');
  return result;
};
const view = (wallet: WalletDocument & { _id: unknown }) => ({
  id: String(wallet._id),
  currency: wallet.currency,
  status: wallet.status,
  availableBalance: wallet.availableBalancePaise / 100,
  totalCredited: wallet.totalCreditedPaise / 100,
  totalDebited: wallet.totalDebitedPaise / 100,
  entries: [...wallet.entries].reverse().slice(0, 100).map((entry) => ({
    id: String(entry._id),
    operationId: entry.operationId,
    direction: entry.direction,
    amount: entry.amountPaise / 100,
    sourceType: entry.sourceType,
    sourceReference: entry.sourceReference,
    description: entry.description,
    createdAt: entry.createdAt
  }))
});
const ensure = (customer: Types.ObjectId) => WalletModel.findOneAndUpdate(
  { customer },
  { $setOnInsert: { customer, currency: 'INR', status: 'active', availableBalancePaise: 0, totalCreditedPaise: 0, totalDebitedPaise: 0, entries: [] } },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);
const existingOperation = (wallet: WalletDocument, operationId: string) => wallet.entries.find((entry) => entry.operationId === operationId);

export const WalletService = {
  async balance(customerId: string): Promise<unknown> {
    const wallet = await ensure(objectId(customerId));
    if (!wallet) throw new ApiError(500, 'Wallet could not be loaded');
    return view(wallet);
  },

  async credit(input: WalletOperation): Promise<{ entryId: string; status: 'processed'; balance: number; reused: boolean }> {
    const customer = objectId(input.customerId);
    const amountPaise = paise(input.amount);
    await ensure(customer);
    const createdAt = new Date();
    const wallet = await WalletModel.findOneAndUpdate(
      { customer, status: 'active', 'entries.operationId': { $ne: input.operationId } },
      {
        $inc: { availableBalancePaise: amountPaise, totalCreditedPaise: amountPaise },
        $push: { entries: { operationId: input.operationId, direction: 'credit', amountPaise, sourceType: input.sourceType, sourceReference: input.sourceReference, description: input.description, ...(input.createdBy ? { createdBy: objectId(input.createdBy) } : {}), createdAt } }
      },
      { new: true }
    );
    if (wallet) {
      const entry = existingOperation(wallet, input.operationId);
      if (!entry) throw new ApiError(500, 'Wallet credit was not recorded');
      return { entryId: String(entry._id), status: 'processed', balance: wallet.availableBalancePaise / 100, reused: false };
    }
    const current = await WalletModel.findOne({ customer });
    if (!current) throw new ApiError(500, 'Wallet could not be loaded');
    const entry = existingOperation(current, input.operationId);
    if (!entry) throw new ApiError(409, current.status === 'locked' ? 'Wallet is locked' : 'Wallet credit could not be applied');
    if (entry.direction !== 'credit' || entry.amountPaise !== amountPaise || entry.sourceReference !== input.sourceReference) throw new ApiError(409, 'Wallet operation key was reused with different details');
    return { entryId: String(entry._id), status: 'processed', balance: current.availableBalancePaise / 100, reused: true };
  },

  async debit(input: WalletOperation): Promise<{ entryId: string; status: 'processed'; balance: number; reused: boolean }> {
    const customer = objectId(input.customerId);
    const amountPaise = paise(input.amount);
    await ensure(customer);
    const createdAt = new Date();
    const wallet = await WalletModel.findOneAndUpdate(
      { customer, status: 'active', availableBalancePaise: { $gte: amountPaise }, 'entries.operationId': { $ne: input.operationId } },
      {
        $inc: { availableBalancePaise: -amountPaise, totalDebitedPaise: amountPaise },
        $push: { entries: { operationId: input.operationId, direction: 'debit', amountPaise, sourceType: input.sourceType, sourceReference: input.sourceReference, description: input.description, ...(input.createdBy ? { createdBy: objectId(input.createdBy) } : {}), createdAt } }
      },
      { new: true }
    );
    if (wallet) {
      const entry = existingOperation(wallet, input.operationId);
      if (!entry) throw new ApiError(500, 'Wallet debit was not recorded');
      return { entryId: String(entry._id), status: 'processed', balance: wallet.availableBalancePaise / 100, reused: false };
    }
    const current = await WalletModel.findOne({ customer });
    if (!current) throw new ApiError(500, 'Wallet could not be loaded');
    const entry = existingOperation(current, input.operationId);
    if (entry) {
      if (entry.direction !== 'debit' || entry.amountPaise !== amountPaise || entry.sourceReference !== input.sourceReference) throw new ApiError(409, 'Wallet operation key was reused with different details');
      return { entryId: String(entry._id), status: 'processed', balance: current.availableBalancePaise / 100, reused: true };
    }
    if (current.status === 'locked') throw new ApiError(409, 'Wallet is locked');
    throw new ApiError(409, 'Insufficient Cruisin Wallet balance');
  }
};
