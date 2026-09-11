// Governed by .rules v1.0
import crypto from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ExchangeRequestModel } from '../../models/exchange-request.model.js';
import { OrderModel } from '../../models/order.model.js';
import { ProductModel } from '../../models/product.model.js';
import { ReturnRequestModel } from '../../models/return-request.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import { UserModel } from '../../models/user.model.js';
import { WalletModel } from '../../models/wallet.model.js';
import { ReturnExchangeService } from './return-exchange.service.js';
import { PaymentService } from '../payment.service.js';
import { env } from '../../config/env.js';
import { UploadService } from '../upload.service.js';

const marker = 'RETURN-FEE-QA-20260812';
const customerId = new Types.ObjectId();
const otherCustomerId = new Types.ObjectId();
let orderId = '';
let undeliveredOrderId = '';
let codOrderId = '';
let firstVariantId = '';
let secondVariantId = '';
const address = { fullName: 'Return Test', phone: '9000000000', line1: 'Test address', city: 'Delhi', state: 'Delhi', postalCode: '110001', country: 'India' };
const evidence = (owner: Types.ObjectId) => { const publicId = `cruisin/returns/${owner}/test-photo`; const version = 1; return [{ publicId, version, format: 'jpg' as const, token: crypto.createHmac('sha256', env.JWT_ACCESS_SECRET).update(`${owner}:${publicId}:${version}`).digest('hex') }]; };

beforeAll(async () => {
  let paymentSequence = 0;
  vi.spyOn(PaymentService, 'getProvider').mockReturnValue({
    createOrder: vi.fn().mockImplementation(async () => ({ id: `order_mock_return_fee_${++paymentSequence}`, amount: 100, currency: 'INR', provider: 'razorpay' })),
    verifyPayment: vi.fn().mockImplementation(async (payload: Record<string, unknown>) => payload.mockVerified === true),
    createRefund: vi.fn().mockResolvedValue({ id: 'rfnd_mock_return_product', amount: 1_800, status: 'processed' })
  });
  if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGODB_URI!);
  await UserModel.deleteMany({ _id: { $in: [customerId, otherCustomerId] } });
  await UserModel.create({ _id: customerId, name: 'Return Test', email: `return-${customerId}@test.local`, passwordHash: 'not-used-in-test', role: 'customer', status: 'active' });
  await ReturnRequestModel.deleteMany({ idempotencyKey: { $in: ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004'] } });
  const product = await ProductModel.create({ title: marker, slug: marker.toLowerCase(), description: 'Return payment integration test product', richDescription: 'Local-only QA', category: new Types.ObjectId(), basePrice: 900, variants: [
    { size: 'M', color: 'Black', colorHex: '#000000', sku: `${marker}-M`, price: 900, stock: 10, weight: 0.25, dimensions: { length: 30, width: 25, height: 2 } },
    { size: 'L', color: 'Black', colorHex: '#000000', sku: `${marker}-L`, price: 900, stock: 10, weight: 0.25, dimensions: { length: 30, width: 25, height: 2 } }
  ] });
  firstVariantId = String(product.variants[0]?._id);
  secondVariantId = String(product.variants[1]?._id);
  const baseOrder = { user: customerId, shippingAddress: address, billingAddress: address, paymentMethod: 'razorpay', paymentMode: 'online', paymentProvider: 'razorpay', paymentStatus: 'paid', razorpayPaymentId: 'pay_original_return_order', fulfillmentStatus: 'fulfilled', subtotal: 2_700, tax: 0, shipping: 0, discount: 0, codFee: 0, total: 2_700, amountPaid: 2_700, amountDue: 0, stockReserved: true, items: [
    { product: product._id, variant: product.variants[0]?._id, title: product.title, sku: `${marker}-M`, size: 'M', color: 'Black', quantity: 2, price: 900, image: 'https://example.invalid/m.jpg' },
    { product: product._id, variant: product.variants[1]?._id, title: product.title, sku: `${marker}-L`, size: 'L', color: 'Black', quantity: 1, price: 900, image: 'https://example.invalid/l.jpg' }
  ] };
  const delivered = await OrderModel.create({ ...baseOrder, orderNumber: `CR-${marker}-DELIVERED`, orderStatus: 'delivered' });
  const undelivered = await OrderModel.create({ ...baseOrder, orderNumber: `CR-${marker}-CONFIRMED`, orderStatus: 'confirmed', fulfillmentStatus: 'pending_logistics' });
  const cod = await OrderModel.create({ ...baseOrder, orderNumber: `CR-${marker}-COD`, orderStatus: 'delivered', paymentMethod: 'cod', paymentMode: 'cod', paymentProvider: 'cod', razorpayPaymentId: undefined });
  orderId = String(delivered._id);
  undeliveredOrderId = String(undelivered._id);
  codOrderId = String(cod._id);
  await ShipmentModel.create({ order: delivered._id, shipmentType: 'forward', sourceOrderId: delivered.orderNumber, pickupLocation: 'Local QA', package: { productWeightKg: 0.5, packagingWeightKg: 0.03, deadWeightKg: 0.53, lengthCm: 30, breadthCm: 25, heightCm: 4 }, shipmentStatus: 'delivered', deliveredDate: new Date(), idempotencyKey: `forward:${marker}` });
  await ShipmentModel.create({ order: cod._id, shipmentType: 'forward', sourceOrderId: cod.orderNumber, pickupLocation: 'Local QA', package: { productWeightKg: 0.5, packagingWeightKg: 0.03, deadWeightKg: 0.53, lengthCm: 30, breadthCm: 25, heightCm: 4 }, shipmentStatus: 'delivered', deliveredDate: new Date(), idempotencyKey: `forward:${marker}:cod` });
});

afterAll(async () => {
  const orders = await OrderModel.find({ orderNumber: { $regex: marker } }).select('_id').lean();
  const ids = orders.map((order) => order._id);
  await Promise.all([ReturnRequestModel.deleteMany({ order: { $in: ids } }), ExchangeRequestModel.deleteMany({ order: { $in: ids } }), ShipmentModel.deleteMany({ order: { $in: ids } }), OrderModel.deleteMany({ _id: { $in: ids } }), ProductModel.deleteMany({ title: marker }), WalletModel.deleteMany({ customer: { $in: [customerId, otherCustomerId] } }), UserModel.deleteMany({ _id: { $in: [customerId, otherCustomerId] } })]);
  await mongoose.disconnect();
  vi.restoreAllMocks();
});

describe('prepaid return handling fee', () => {
  it('creates one ₹100 payment for a multi-item request and safely reuses it', async () => {
    const input = { orderId, items: [{ variantId: firstVariantId, quantity: 1 }, { variantId: secondVariantId, quantity: 1 }], reason: 'wrong_size_fit', details: '', evidence: evidence(customerId), idempotencyKey: '10000000-0000-4000-8000-000000000001' };
    const first = await ReturnExchangeService.createReturn(String(customerId), input) as { request: { id: string; handlingFee: number; handlingFeePaymentStatus: string }; payment: { id: string; amount: number } };
    const replay = await ReturnExchangeService.createReturn(String(customerId), input) as typeof first;
    expect(first).toMatchObject({ request: { handlingFee: 100, handlingFeePaymentStatus: 'pending' }, payment: { amount: 100 } });
    expect(replay.payment.id).toBe(first.payment.id);
    expect(await ReturnRequestModel.countDocuments({ order: orderId })).toBe(1);
    const storedDraft = await ReturnRequestModel.findById(first.request.id).lean();
    expect(storedDraft?.evidence).toEqual([expect.objectContaining({ publicId: expect.stringContaining(String(customerId)) })]);
    expect(JSON.stringify(storedDraft)).not.toContain(input.evidence[0]?.token);

    const paid = await ReturnExchangeService.verifyReturnPayment(String(customerId), { requestId: first.request.id, payload: { razorpay_order_id: first.payment.id, razorpay_payment_id: 'pay_mock_return_fee', mockVerified: true } }) as { status: string; handlingFeePaymentStatus: string };
    expect(paid).toMatchObject({ status: 'requested', handlingFeePaymentStatus: 'paid' });
    await expect(ReturnExchangeService.verifyReturnPayment(String(customerId), { requestId: first.request.id, payload: {} })).resolves.toMatchObject({ status: 'requested', handlingFeePaymentStatus: 'paid' });
    const mine = await ReturnExchangeService.mine(String(customerId));
    expect(JSON.stringify(mine)).not.toContain(first.payment.id);
    expect(JSON.stringify(mine)).not.toContain('pay_mock_return_fee');
    await ReturnRequestModel.updateOne({ _id: first.request.id }, { $set: { status: 'quality_check_passed' } });
    await ReturnExchangeService.actOnReturn(first.request.id, { action: 'open_refund_window' }, String(new Types.ObjectId()));
    await ReturnExchangeService.submitRefundDestination(String(customerId), first.request.id, { method: 'original_payment' });
    const refunded = await ReturnExchangeService.actOnReturn(first.request.id, { action: 'refund_pending' }, String(new Types.ObjectId())) as { status: string; refundStatus: string; productRefundAmount: number; productRefundReference: string };
    expect(refunded).toMatchObject({ status: 'refunded', refundStatus: 'processed', productRefundAmount: 1_800, productRefundReference: 'rfnd_mock_return_product' });
    const refundedOrder = await OrderModel.findById(orderId).lean();
    expect(refundedOrder?.refunds).toEqual([expect.objectContaining({ amount: 1_800, providerRefundId: 'rfnd_mock_return_product' })]);
  });

  it('prevents cross-customer idempotency leakage and over-returning purchased quantities', async () => {
    const input = { orderId, items: [{ variantId: firstVariantId, quantity: 1 }], reason: 'quality_issue', details: '', evidence: evidence(customerId), idempotencyKey: '10000000-0000-4000-8000-000000000001' };
    await expect(ReturnExchangeService.createReturn(String(otherCustomerId), input)).rejects.toMatchObject({ statusCode: 409 });
    await expect(ReturnExchangeService.createReturn(String(customerId), { ...input, items: [{ variantId: firstVariantId, quantity: 2 }], idempotencyKey: '10000000-0000-4000-8000-000000000002' })).rejects.toMatchObject({ statusCode: 409 });
    expect(() => UploadService.validateReturnEvidence(input.evidence[0]!, String(otherCustomerId))).toThrow('Invalid return photo');
  });

  it('rejects requests before delivery without creating a payment or request', async () => {
    await expect(ReturnExchangeService.createReturn(String(customerId), { orderId: undeliveredOrderId, items: [{ variantId: firstVariantId, quantity: 1 }], reason: 'other', details: '', evidence: evidence(customerId), idempotencyKey: '10000000-0000-4000-8000-000000000003' })).rejects.toMatchObject({ statusCode: 409 });
    expect(await ReturnRequestModel.countDocuments({ order: undeliveredOrderId })).toBe(0);
  });

  it('records a COD manual UPI refund only after an admin supplies the matching destination and UTR', async () => {
    const created = await ReturnExchangeService.createReturn(String(customerId), { orderId: codOrderId, items: [{ variantId: firstVariantId, quantity: 1 }], reason: 'quality_issue', details: 'COD refund destination test', evidence: evidence(customerId), idempotencyKey: '10000000-0000-4000-8000-000000000004' }) as { request: { id: string }; payment: { id: string } };
    await ReturnExchangeService.verifyReturnPayment(String(customerId), { requestId: created.request.id, payload: { razorpay_order_id: created.payment.id, razorpay_payment_id: 'pay_mock_return_fee_cod', mockVerified: true } });
    await ReturnRequestModel.updateOne({ _id: created.request.id }, { $set: { status: 'quality_check_passed' } });
    await ReturnExchangeService.actOnReturn(created.request.id, { action: 'open_refund_window' }, String(new Types.ObjectId()));
    const mine = await ReturnExchangeService.mine(String(customerId)) as { returns: Array<{ _id: string; refundAvailableMethods: string[]; refundUpiMode: string }> };
    expect(mine.returns.find((request) => request._id === created.request.id)).toMatchObject({ refundAvailableMethods: ['wallet', 'upi'], refundUpiMode: 'manual_admin' });
    await expect(ReturnExchangeService.submitRefundDestination(String(otherCustomerId), created.request.id, { method: 'upi', upiId: 'attacker@upi' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(ReturnExchangeService.submitRefundDestination(String(customerId), created.request.id, { method: 'original_payment' })).rejects.toMatchObject({ statusCode: 400 });
    const customerSavedDestination = await ReturnExchangeService.submitRefundDestination(String(customerId), created.request.id, { method: 'upi', upiId: '9876543210@upi' }) as { refundDestination?: { upiId?: string; submittedByRole?: string } };
    expect(customerSavedDestination.refundDestination).toMatchObject({ upiId: '9876543210@upi', submittedByRole: 'customer' });
    expect(JSON.stringify(customerSavedDestination)).not.toMatch(/v1[ej]\./);
    const stored = await ReturnRequestModel.findById(created.request.id).select('+refundDestination.encryptedDetails').lean();
    expect(stored?.refundDestination?.encryptedDetails).toMatch(/^v1[ej]\./);
    expect(JSON.stringify(stored)).not.toContain('9876543210@upi');
    const adminView = await ReturnExchangeService.listReturns('admin') as Array<{ _id: Types.ObjectId; refundDestination?: { manualUpiId?: string } }>;
    const managerView = await ReturnExchangeService.listReturns('manager') as Array<{ _id: Types.ObjectId; refundDestination?: { manualUpiId?: string } }>;
    expect(adminView.find((request) => String(request._id) === created.request.id)?.refundDestination?.manualUpiId).toBe('9876543210@upi');
    expect(managerView.find((request) => String(request._id) === created.request.id)?.refundDestination?.manualUpiId).toBeUndefined();
    const adminId = String(new Types.ObjectId());
    await ReturnExchangeService.setRefundDestinationByAdmin(created.request.id, { method: 'wallet' }, adminId, 'admin');
    let customerView = await ReturnExchangeService.mine(String(customerId)) as { returns: Array<{ _id: string; manualTransferReference?: string; refundDestination?: { method?: string; maskedDetails?: string; upiId?: string; submittedByRole?: string } }> };
    expect(customerView.returns.find((request) => request._id === created.request.id)?.refundDestination).toMatchObject({ method: 'wallet', maskedDetails: 'Cruisin Wallet', submittedByRole: 'admin' });
    const adminSavedDestination = await ReturnExchangeService.setRefundDestinationByAdmin(created.request.id, { method: 'upi', upiId: 'customer.refund@upi' }, adminId, 'admin') as { refundDestination?: { upiId?: string; submittedByRole?: string } };
    expect(adminSavedDestination.refundDestination).toMatchObject({ upiId: 'customer.refund@upi', submittedByRole: 'admin' });
    expect(JSON.stringify(adminSavedDestination)).not.toMatch(/v1[ej]\./);
    customerView = await ReturnExchangeService.mine(String(customerId)) as typeof customerView;
    expect(customerView.returns.find((request) => request._id === created.request.id)?.refundDestination).toMatchObject({ method: 'upi', maskedDetails: 'c******@upi', upiId: 'customer.refund@upi', submittedByRole: 'admin' });
    await expect(ReturnExchangeService.actOnReturn(created.request.id, { action: 'record_manual_upi_refund', upiId: '9876543210@upi', transactionReference: 'UTR-MISMATCH-1' }, adminId)).rejects.toMatchObject({ statusCode: 409 });
    const refunded = await ReturnExchangeService.actOnReturn(created.request.id, { action: 'record_manual_upi_refund', upiId: 'customer.refund@upi', transactionReference: 'UTR-COD-REFUND-001' }, adminId) as { status: string; refundStatus: string; manualTransferReference: string };
    expect(refunded).toMatchObject({ status: 'refunded', refundStatus: 'processed', manualTransferReference: 'UTR-COD-REFUND-001' });
    expect(JSON.stringify(refunded)).not.toMatch(/v1[ej]\./);
    customerView = await ReturnExchangeService.mine(String(customerId)) as typeof customerView;
    expect(customerView.returns.find((request) => request._id === created.request.id)).toMatchObject({ manualTransferReference: 'UTR-COD-REFUND-001', refundDestination: { maskedDetails: 'c******@upi', upiId: 'customer.refund@upi', submittedByRole: 'admin' } });
  });
});
