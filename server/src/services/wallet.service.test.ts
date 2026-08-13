// Governed by .rules v1.0
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WalletModel } from '../models/wallet.model.js';
import { WalletService } from './wallet.service.js';

const customerId = new Types.ObjectId();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
  await WalletModel.deleteMany({ customer: customerId });
});
afterAll(async () => {
  await WalletModel.deleteMany({ customer: customerId });
  await mongoose.disconnect();
});

describe('Cruisin Wallet atomic ledger', () => {
  it('applies a concurrent credit exactly once and preserves paise precision', async () => {
    const operation = { customerId: String(customerId), amount: 100.37, operationId: 'wallet-test-credit-1', sourceType: 'return_refund' as const, sourceReference: 'RET-WALLET-1', description: 'Return refund test' };
    const results = await Promise.all([WalletService.credit(operation), WalletService.credit(operation), WalletService.credit(operation)]);
    expect(results.filter((result) => result.reused === false)).toHaveLength(1);
    const wallet = await WalletService.balance(String(customerId)) as { availableBalance: number; totalCredited: number; entries: unknown[] };
    expect(wallet).toMatchObject({ availableBalance: 100.37, totalCredited: 100.37 });
    expect(wallet.entries).toHaveLength(1);
  });

  it('makes debits idempotent and rejects an overdraw without changing balance', async () => {
    const operation = { customerId: String(customerId), amount: 40.12, operationId: 'wallet-test-debit-1', sourceType: 'order_payment' as const, sourceReference: 'ORDER-WALLET-1', description: 'Wallet order payment' };
    await WalletService.debit(operation);
    await expect(WalletService.debit(operation)).resolves.toMatchObject({ reused: true, balance: 60.25 });
    await expect(WalletService.debit({ ...operation, operationId: 'wallet-test-overdraw', amount: 100 })).rejects.toMatchObject({ statusCode: 409 });
    await expect(WalletService.balance(String(customerId))).resolves.toMatchObject({ availableBalance: 60.25, totalCredited: 100.37, totalDebited: 40.12 });
  });
});
