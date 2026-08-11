import crypto from 'node:crypto';
import { expect, test, type APIRequestContext, type APIResponse } from '@playwright/test';

const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8100/api/v1';
const webhookSecret = 'razorpay_logistics_webhook_secret';
const logisticsWebhookSecret = 'shiprocket_logistics_webhook_secret';
const password = 'LogisticsE2E123!';
const ids = {
  product: '66b000000000000000000101',
  variantA: '66b000000000000000000111',
  variantB: '66b000000000000000000112',
  outageOrder: '66b000000000000000000301',
  ndrOrder: '66b000000000000000000302',
  rtoOrder: '66b000000000000000000303',
  returnOrder: '66b000000000000000000304',
  exchangeOrder: '66b000000000000000000305',
  safeDeleteOrder: '66b000000000000000000306',
  cancellationOrder: '66b000000000000000000307',
  ndrShipment: '66b000000000000000000402',
  rtoShipment: '66b000000000000000000403',
  cancellationShipment: '66b000000000000000000406'
} as const;
const address = {
  fullName: 'Logistics E2E Customer',
  phone: '9000000002',
  line1: '1 Test Warehouse Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  postalCode: '560001',
  country: 'India'
};

interface Envelope<T> {
  success: boolean;
  data: T;
  message: string;
}
interface Shipment {
  _id: string;
  order: { _id?: string; orderNumber?: string } | string;
  sourceOrderId: string;
  providerOrderId?: string;
  providerShipmentId?: string;
  awb?: string;
  pickupDate?: string;
  shipmentStatus: string;
  package?: { measurementConfirmed?: boolean };
  ndr?: { actionHistory?: Array<{ action: string; note?: string }>; reattemptStatus?: string };
  rto?: { status?: string; inventoryRecoveryStatus?: string };
  label?: { status?: string };
  invoice?: { status?: string };
  manifest?: { status?: string };
}
interface Paginated<T> {
  items: T[];
  total: number;
}
interface Order {
  _id: string;
  orderNumber: string;
  paymentStatus: string;
  orderStatus: string;
  fulfillmentStatus?: string;
  amountPaid?: number;
  refunds?: Array<{ amount?: number; status?: string }>;
  timeline?: Array<{ status: string; note?: string }>;
  razorpayOrderId?: string;
}
interface AnalyticsSummary {
  summary: {
    paidOrders: number;
    cancelledOrders: number;
    grossRevenue: number;
    netRevenue: number;
  };
  ordersByStatus: Record<string, number>;
}
interface WorkflowRequest {
  _id: string;
  status: string;
  refundStatus?: string;
  inventoryReserved?: boolean;
  reverseShipment?: string;
  replacementShipment?: string;
  history: Array<{ action: string }>;
}

const responseJson = async <T>(response: APIResponse): Promise<T> => {
  const body = await response.json() as Envelope<T> & { error?: string[] };
  expect(response.ok(), `${response.url()}: ${body.message} ${(body.error ?? []).join(', ')}`).toBeTruthy();
  expect(body.success).toBeTruthy();
  return body.data;
};
const authHeaders = (token: string): Record<string, string> => ({ Authorization: `Bearer ${token}` });
const login = async (request: APIRequestContext, email: string): Promise<string> => {
  const response = await request.post(`${apiUrl}/auth/login`, { data: { email, password } });
  const data = await responseJson<{ accessToken: string }>(response);
  return data.accessToken;
};
const eventually = async <T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  label: string,
  timeoutMilliseconds = 15_000
): Promise<T> => {
  const deadline = Date.now() + timeoutMilliseconds;
  let latest: T | undefined;
  while (Date.now() < deadline) {
    latest = await read();
    if (ready(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}; latest value was ${JSON.stringify(latest)}`);
};
const shipmentList = async (request: APIRequestContext, adminToken: string, search?: string): Promise<Paginated<Shipment>> => {
  const response = await request.get(`${apiUrl}/admin/logistics`, {
    headers: authHeaders(adminToken),
    params: { page: '1', limit: '100', ...(search ? { search } : {}) }
  });
  return responseJson<Paginated<Shipment>>(response);
};
const shipmentDetail = async (request: APIRequestContext, adminToken: string, shipmentId: string): Promise<Shipment> => {
  const response = await request.get(`${apiUrl}/admin/logistics/${shipmentId}`, { headers: authHeaders(adminToken) });
  return responseJson<Shipment>(response);
};
const signedRazorpayWebhook = async (
  request: APIRequestContext,
  providerOrderId: string,
  eventId: string
): Promise<{ received: boolean; processed: boolean }> => {
  const raw = JSON.stringify({
    id: eventId,
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_${eventId}`,
          order_id: providerOrderId,
          method: 'card'
        }
      }
    }
  });
  const signature = crypto.createHmac('sha256', webhookSecret).update(raw).digest('hex');
  const response = await request.post(`${apiUrl}/payments/webhooks/razorpay`, {
    data: raw,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': eventId
    }
  });
  return responseJson<{ received: boolean; processed: boolean }>(response);
};
const logisticsWebhook = async (
  request: APIRequestContext,
  payload: Record<string, unknown>
): Promise<{ accepted: true; duplicate: boolean; matched: boolean }> => {
  const response = await request.post(`${apiUrl}/webhooks/logistics-events`, {
    data: payload,
    headers: { 'x-api-key': logisticsWebhookSecret }
  });
  return responseJson<{ accepted: true; duplicate: boolean; matched: boolean }>(response);
};
const workflowAction = async (
  request: APIRequestContext,
  adminToken: string,
  kind: 'returns' | 'exchanges',
  requestId: string,
  action: string
): Promise<WorkflowRequest> => {
  const response = await request.post(`${apiUrl}/admin/${kind}/${requestId}/action`, {
    headers: authHeaders(adminToken),
    data: { action, note: `E2E ${action}` }
  });
  return responseJson<WorkflowRequest>(response);
};
const variantStock = async (request: APIRequestContext, adminToken: string, variantId: string): Promise<number> => {
  const response = await request.get(`${apiUrl}/products/admin/${ids.product}`, { headers: authHeaders(adminToken) });
  const product = await responseJson<{ variants: Array<{ _id: string; stock: number }> }>(response);
  const variant = product.variants.find((candidate) => candidate._id === variantId);
  if (!variant) throw new Error(`Variant ${variantId} was not returned`);
  return variant.stock;
};

test.describe.serial('isolated Shiprocket production-hardening matrix', () => {
  let adminToken = '';
  let customerToken = '';
  let managerToken = '';

  test.beforeAll(async ({ request }) => {
    adminToken = await login(request, 'logistics-admin@example.test');
    customerToken = await login(request, 'logistics-customer@example.test');
    managerToken = await login(request, 'logistics-manager@example.test');
  });

  test('prepaid quote, checkout, trusted settlement, shipment, AWB, pickup, tracking and delivery are idempotent', async ({ request }) => {
    const invalidPincode = await request.post(`${apiUrl}/logistics/quotes`, {
      headers: authHeaders(customerToken),
      data: { deliveryPostcode: '56000', paymentMode: 'prepaid' }
    });
    expect(invalidPincode.status()).toBe(400);
    const nonServiceable = await request.post(`${apiUrl}/logistics/quotes`, {
      headers: authHeaders(customerToken),
      data: { deliveryPostcode: '999999', paymentMode: 'prepaid' }
    });
    expect(nonServiceable.status()).toBe(400);
    expect(JSON.stringify(await nonServiceable.json())).not.toContain('Shiprocket');
    const prepaidOnlyCod = await request.post(`${apiUrl}/logistics/quotes`, {
      headers: authHeaders(customerToken),
      data: { deliveryPostcode: '110001', paymentMode: 'cod' }
    });
    expect(prepaidOnlyCod.status()).toBe(400);

    const quoteResponse = await request.post(`${apiUrl}/logistics/quotes`, {
      headers: authHeaders(customerToken),
      data: { deliveryPostcode: '560001', paymentMode: 'prepaid' }
    });
    const quote = await responseJson<{ quoteId: string; options: Array<{ code: string; courierId: number }> }>(quoteResponse);
    expect(quote.options.map((option) => option.code)).toEqual(expect.arrayContaining(['standard', 'express']));

    const checkoutResponse = await request.post(`${apiUrl}/orders/checkout`, {
      headers: authHeaders(customerToken),
      data: {
        shippingAddress: address,
        billingAddress: address,
        paymentMethod: 'razorpay',
        paymentMode: 'online',
        shippingMethod: 'standard',
        logisticsQuoteId: quote.quoteId,
        idempotencyKey: '00000000-0000-4000-8000-000000000010'
      }
    });
    const checkout = await responseJson<{ order: Order; payment: { id: string } }>(checkoutResponse);
    expect(checkout.order.paymentStatus).toBe('pending');
    expect((await shipmentList(request, adminToken, checkout.order.orderNumber)).total).toBe(0);

    expect((await signedRazorpayWebhook(request, checkout.payment.id, 'evt_prepaid_e2e')).processed).toBe(true);
    expect((await signedRazorpayWebhook(request, checkout.payment.id, 'evt_prepaid_e2e')).processed).toBe(false);

    const shipment = await eventually(
      () => shipmentList(request, adminToken, checkout.order.orderNumber),
      (result) => result.total === 1 && Boolean(result.items[0]?.providerOrderId),
      'prepaid provider order'
    ).then((result) => result.items[0]);
    expect(shipment.package?.measurementConfirmed).toBe(true);

    const assign = async (): Promise<Shipment> => responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${shipment._id}/assign-awb`,
      { headers: authHeaders(adminToken), data: { courierId: 10 } }
    ));
    const firstAwb = await assign();
    const duplicateAwb = await assign();
    expect(duplicateAwb.awb).toBe(firstAwb.awb);

    const pickup = async (): Promise<Shipment> => responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${shipment._id}/schedule-pickup`,
      { headers: authHeaders(adminToken) }
    ));
    const firstPickup = await pickup();
    const duplicatePickup = await pickup();
    expect(duplicatePickup.pickupDate).toBe(firstPickup.pickupDate);

    for (const kind of ['label', 'invoice', 'manifest'] as const) {
      const generated = await responseJson<Shipment>(await request.post(
        `${apiUrl}/admin/logistics/${shipment._id}/${kind}`,
        { headers: authHeaders(adminToken) }
      ));
      expect(generated[kind]?.status).toBe('ready');
      const duplicate = await responseJson<Shipment>(await request.post(
        `${apiUrl}/admin/logistics/${shipment._id}/${kind}`,
        { headers: authHeaders(adminToken) }
      ));
      expect(duplicate[kind]?.status).toBe('ready');
      const access = await responseJson<{ kind: string; status: string; url: string }>(await request.get(
        `${apiUrl}/admin/logistics/${shipment._id}/documents/${kind}`,
        { headers: authHeaders(adminToken) }
      ));
      expect(access).toMatchObject({ kind, status: 'ready' });
      expect(access.url).toMatch(/^mock:/);
    }

    const tracked = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${shipment._id}/track`,
      { headers: authHeaders(adminToken) }
    ));
    expect(tracked.shipmentStatus).toBe('in_transit');
    const deliveredPayload = {
      awb: firstAwb.awb,
      current_status: 'Delivered',
      status_id: 7,
      scans: [{ date: '2026-07-28T10:00:00.000Z', status: 'Delivered', activity: 'Delivered to customer', location: 'Bengaluru' }]
    };
    expect((await logisticsWebhook(request, deliveredPayload)).duplicate).toBe(false);
    expect((await logisticsWebhook(request, deliveredPayload)).duplicate).toBe(true);
    expect((await shipmentDetail(request, adminToken, shipment._id)).shipmentStatus).toBe('delivered');

    const orderResponse = await request.get(`${apiUrl}/orders/${checkout.order._id}`, { headers: authHeaders(customerToken) });
    expect((await responseJson<Order>(orderResponse)).orderStatus).toBe('delivered');
    const events = await responseJson<Paginated<{ eventType: string; shipment: string; deliveries: Array<{ channel: string; status: string }> }>>(
      await request.get(`${apiUrl}/admin/logistics/notifications`, {
        headers: authHeaders(adminToken),
        params: { page: '1', limit: '100' }
      })
    );
    const deliveredEvents = events.items.filter((event) => event.eventType === 'delivered' && event.shipment === shipment._id);
    expect(deliveredEvents).toHaveLength(1);
    expect(deliveredEvents[0].deliveries).toEqual(expect.arrayContaining([
      expect.objectContaining({ channel: 'in_app', status: 'sent' }),
      expect.objectContaining({ channel: 'email', status: 'skipped' }),
      expect.objectContaining({ channel: 'sms', status: 'skipped' }),
      expect.objectContaining({ channel: 'whatsapp', status: 'skipped' })
    ]));

    await responseJson(await request.post(`${apiUrl}/cart/items`, {
      headers: authHeaders(customerToken),
      data: { product: ids.product, variant: ids.variantA, quantity: 1 }
    }));
    const codQuote = await responseJson<{ quoteId: string }>(await request.post(`${apiUrl}/logistics/quotes`, {
      headers: authHeaders(customerToken),
      data: { deliveryPostcode: '560001', paymentMode: 'cod' }
    }));
    const codCheckoutInput = {
      shippingAddress: address,
      billingAddress: address,
      paymentMethod: 'cod',
      paymentMode: 'cod',
      shippingMethod: 'standard',
      logisticsQuoteId: codQuote.quoteId,
      idempotencyKey: '00000000-0000-4000-8000-000000000011'
    };
    const firstCod = await responseJson<{ order: Order; payment: null }>(await request.post(`${apiUrl}/orders/checkout`, {
      headers: authHeaders(customerToken),
      data: codCheckoutInput
    }));
    const duplicateCod = await responseJson<{ order: Order; payment: null }>(await request.post(`${apiUrl}/orders/checkout`, {
      headers: authHeaders(customerToken),
      data: codCheckoutInput
    }));
    expect(firstCod.order).toMatchObject({ paymentStatus: 'cod_pending', orderStatus: 'placed' });
    expect(duplicateCod.order._id).toBe(firstCod.order._id);
    const manualCodShipment = await shipmentList(request, adminToken, firstCod.order.orderNumber);
    expect(manualCodShipment.total).toBe(1);
    expect(manualCodShipment.items[0]).toMatchObject({ shipmentStatus: 'draft' });
    expect(manualCodShipment.items[0].providerOrderId).toBeUndefined();
  });

  test('captured payment survives one provider outage, a durable job retries, and no provider order is duplicated', async ({ request }) => {
    expect((await signedRazorpayWebhook(request, 'order_mock_outage_once', 'evt_outage_once')).processed).toBe(true);
    const retryableJob = await eventually(
      async () => responseJson<Paginated<{ dedupeKey: string; status: string; attempts: number; lastError?: { retryable?: boolean } }>>(
        await request.get(`${apiUrl}/admin/logistics/jobs`, {
          headers: authHeaders(adminToken),
          params: { page: '1', limit: '100' }
        })
      ),
      (result) => result.items.some((job) => job.dedupeKey === `create-order:${ids.outageOrder}` && job.attempts === 1 && job.status === 'queued' && job.lastError?.retryable === true),
      'retryable outage job'
    );
    expect(retryableJob.items.find((job) => job.dedupeKey === `create-order:${ids.outageOrder}`)?.lastError?.retryable).toBe(true);

    const completedJob = await eventually(
      async () => responseJson<Paginated<{ dedupeKey: string; status: string; attempts: number }>>(
        await request.get(`${apiUrl}/admin/logistics/jobs`, {
          headers: authHeaders(adminToken),
          params: { page: '1', limit: '100' }
        })
      ),
      (result) => result.items.some((job) => job.dedupeKey === `create-order:${ids.outageOrder}` && job.status === 'succeeded'),
      'recovered outage job'
    );
    expect(completedJob.items.find((job) => job.dedupeKey === `create-order:${ids.outageOrder}`)?.attempts).toBe(2);
    const shipments = await shipmentList(request, adminToken, 'CR-OUTAGE-ONCE');
    expect(shipments.total).toBe(1);
    expect(shipments.items[0].providerOrderId).toBeTruthy();
    const order = await responseJson<Order>(await request.get(
      `${apiUrl}/admin/orders/${ids.outageOrder}`,
      { headers: authHeaders(adminToken) }
    ));
    expect(order.paymentStatus).toBe('paid');
  });

  test('NDR appears in the dashboard, contact and reattempt are deduplicated, and webhook replay delivers once', async ({ request }) => {
    const tracked = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.ndrShipment}/track`,
      { headers: authHeaders(adminToken) }
    ));
    expect(tracked.shipmentStatus).toBe('ndr');
    const ndrDashboard = await responseJson<Paginated<Shipment>>(await request.get(
      `${apiUrl}/admin/logistics/ndr`,
      { headers: authHeaders(adminToken), params: { page: '1', limit: '100' } }
    ));
    expect(ndrDashboard.items.some((shipment) => shipment._id === ids.ndrShipment)).toBe(true);
    await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.ndrShipment}/ndr/action`,
      { headers: authHeaders(adminToken), data: { action: 'contacted', note: 'Customer confirmed availability' } }
    ));
    const reattempt = async (): Promise<Shipment> => responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.ndrShipment}/ndr/action`,
      { headers: authHeaders(adminToken), data: { action: 'reattempt', note: 'Retry tomorrow' } }
    ));
    await reattempt();
    await reattempt();
    const detail = await shipmentDetail(request, adminToken, ids.ndrShipment);
    expect(detail.ndr?.actionHistory?.filter((action) => action.action === 'reattempt')).toHaveLength(1);
    expect(detail.ndr?.reattemptStatus).toBe('requested');

    const payload = {
      awb: 'MOCKAWBNDR001',
      current_status: 'Delivered',
      scans: [{ date: '2026-07-28T11:00:00.000Z', status: 'Delivered', activity: 'Delivered after reattempt', location: 'Bengaluru' }]
    };
    expect((await logisticsWebhook(request, payload)).duplicate).toBe(false);
    expect((await logisticsWebhook(request, payload)).duplicate).toBe(true);
    expect((await shipmentDetail(request, adminToken, ids.ndrShipment)).shipmentStatus).toBe('delivered');
  });

  test('RTO receipt does not restore stock; passed inspection restores it exactly once', async ({ request }) => {
    const before = await variantStock(request, adminToken, ids.variantA);
    const ndr = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.rtoShipment}/track`,
      { headers: authHeaders(adminToken) }
    ));
    expect(ndr.shipmentStatus).toBe('ndr');
    const initiated = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.rtoShipment}/ndr/action`,
      { headers: authHeaders(adminToken), data: { action: 'accept_rto', note: 'NDR exhausted' } }
    ));
    expect(initiated.shipmentStatus).toBe('rto_initiated');
    await logisticsWebhook(request, {
      awb: 'MOCKAWBNDR002',
      current_status: 'RTO Delivered',
      scans: [{ date: '2026-07-28T12:00:00.000Z', status: 'RTO Delivered', activity: 'Returned to warehouse', location: 'Bengaluru' }]
    });
    expect((await shipmentDetail(request, adminToken, ids.rtoShipment)).shipmentStatus).toBe('rto_delivered');

    const received = async (): Promise<Shipment> => responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.rtoShipment}/rto/warehouse`,
      { headers: authHeaders(adminToken), data: { action: 'received' } }
    ));
    await received();
    await received();
    expect(await variantStock(request, adminToken, ids.variantA)).toBe(before);

    const inspect = async (): Promise<Shipment> => responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.rtoShipment}/rto/warehouse`,
      { headers: authHeaders(adminToken), data: { action: 'inspection_passed' } }
    ));
    await inspect();
    await inspect();
    expect(await variantStock(request, adminToken, ids.variantA)).toBe(before + 2);
  });

  test('safe test-order deletion requires the exact typed order number in the admin UI', async ({ page }) => {
    const adminUrl = process.env.PLAYWRIGHT_ADMIN_URL ?? 'http://127.0.0.1:3101';
    await page.goto(adminUrl + '/login');
    await page.getByLabel('Email').fill('logistics-admin@example.test');
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Enter Dashboard' }).click();
    await expect(page).toHaveURL(adminUrl + '/');
    await page.getByRole('link', { name: 'Orders', exact: true }).click();
    await expect(page.getByText('CR-E2E-SAFE-DELETE')).toBeVisible();
    await page.getByRole('button', { name: `Delete order ${ids.safeDeleteOrder}` }).click();
    const dialog = page.getByRole('dialog', { name: 'Permanently delete CR-E2E-SAFE-DELETE?' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Delete Permanently' })).toBeDisabled();
    await dialog.getByLabel('Order number').fill('CR-E2E-WRONG');
    await expect(dialog.getByRole('button', { name: 'Delete Permanently' })).toBeDisabled();
    await dialog.getByLabel('Order number').fill('CR-E2E-SAFE-DELETE');
    await expect(dialog.getByRole('button', { name: 'Delete Permanently' })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('delivered order completes return, reverse pickup, receipt, quality check, refund handoff and closure', async ({ request }) => {
    const input = {
      orderId: ids.returnOrder,
      variantId: ids.variantA,
      quantity: 1,
      reason: 'Fit was not suitable',
      details: 'Deterministic logistics return test',
      idempotencyKey: '10000000-0000-4000-8000-000000000001'
    };
    const create = async (): Promise<WorkflowRequest> => responseJson<WorkflowRequest>(await request.post(
      `${apiUrl}/fulfillment/returns`,
      { headers: authHeaders(customerToken), data: input }
    ));
    const first = await create();
    expect((await create())._id).toBe(first._id);
    let current = await workflowAction(request, adminToken, 'returns', first._id, 'approved');
    expect(current.status).toBe('approved');
    current = await workflowAction(request, adminToken, 'returns', first._id, 'create_reverse_pickup');
    expect(current.reverseShipment).toBeTruthy();
    for (const action of ['warehouse_received', 'quality_check_passed', 'refund_pending', 'refunded', 'closed']) {
      current = await workflowAction(request, adminToken, 'returns', first._id, action);
    }
    expect(current).toMatchObject({ status: 'closed', refundStatus: 'processed' });
    expect(current.history.map((entry) => entry.action)).toEqual(expect.arrayContaining([
      'approved', 'create_reverse_pickup', 'warehouse_received', 'quality_check_passed', 'refund_pending', 'refunded', 'closed'
    ]));
  });

  test('delivered order completes exchange with one stock reservation, reverse pickup and replacement shipment', async ({ request }) => {
    const before = await variantStock(request, adminToken, ids.variantB);
    const input = {
      orderId: ids.exchangeOrder,
      variantId: ids.variantA,
      requestedVariantId: ids.variantB,
      quantity: 1,
      idempotencyKey: '20000000-0000-4000-8000-000000000001'
    };
    const create = async (): Promise<WorkflowRequest> => responseJson<WorkflowRequest>(await request.post(
      `${apiUrl}/fulfillment/exchanges`,
      { headers: authHeaders(customerToken), data: input }
    ));
    const first = await create();
    expect((await create())._id).toBe(first._id);
    let current = await workflowAction(request, adminToken, 'exchanges', first._id, 'approve');
    expect(current).toMatchObject({ status: 'inventory_reserved', inventoryReserved: true });
    expect(await variantStock(request, adminToken, ids.variantB)).toBe(before - 1);
    current = await workflowAction(request, adminToken, 'exchanges', first._id, 'create_reverse_pickup');
    expect(current.reverseShipment).toBeTruthy();
    for (const action of ['warehouse_received', 'quality_check_passed', 'replacement_shipped', 'complete', 'close']) {
      current = await workflowAction(request, adminToken, 'exchanges', first._id, action);
    }
    expect(current.status).toBe('closed');
    expect(current.replacementShipment).toBeTruthy();
    expect(current.inventoryReserved).toBe(false);
    expect(await variantStock(request, adminToken, ids.variantB)).toBe(before - 1);
    const shipments = await shipmentList(request, adminToken);
    expect(shipments.items.filter((shipment) => shipment._id === current.replacementShipment)).toHaveLength(1);
  });

  test('admin cancellation is idempotent, manager mutations are denied, and financial analytics stay intact', async ({ request }) => {
    const managerSyncResponse = await request.post(`${apiUrl}/admin/logistics/sync`, { headers: authHeaders(managerToken) });
    const managerSync = await responseJson<{ scanned: number; changed: number; unchanged: number; failed: number; shiprocketMutations: number }>(managerSyncResponse);
    expect(managerSync.scanned).toBeGreaterThan(0);
    expect(managerSync.shiprocketMutations).toBe(0);
    const repeatedManagerSync = await responseJson<{ scanned: number; changed: number; unchanged: number; failed: number; shiprocketMutations: number }>(
      await request.post(`${apiUrl}/admin/logistics/sync`, { headers: authHeaders(managerToken) })
    );
    expect(repeatedManagerSync).toEqual({
      scanned: managerSync.scanned,
      changed: 0,
      unchanged: managerSync.scanned,
      failed: 0,
      shiprocketMutations: 0
    });

    for (const mutation of [
      { method: 'post', path: `/admin/logistics/orders/${ids.cancellationOrder}/create`, data: {} },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/assign-awb`, data: { courierId: 10 } },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/schedule-pickup`, data: {} },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/label`, data: {} },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/invoice`, data: {} },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/manifest`, data: {} },
      { method: 'post', path: `/admin/logistics/${ids.cancellationShipment}/cancel`, data: {} },
      { method: 'get', path: `/admin/logistics/${ids.cancellationShipment}/documents/label` }
    ] as const) {
      const response = mutation.method === 'get'
        ? await request.get(`${apiUrl}${mutation.path}`, { headers: authHeaders(managerToken) })
        : await request.post(`${apiUrl}${mutation.path}`, { headers: authHeaders(managerToken), data: mutation.data });
      expect(response.status(), mutation.path).toBe(403);
    }

    const beforeOrder = await responseJson<Order>(await request.get(`${apiUrl}/admin/orders/${ids.cancellationOrder}`, { headers: authHeaders(adminToken) }));
    const beforeAnalytics = await responseJson<AnalyticsSummary>(await request.get(`${apiUrl}/admin/analytics/summary`, { headers: authHeaders(adminToken), params: { preset: 'last30' } }));

    const firstCancellation = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.cancellationShipment}/cancel`,
      { headers: authHeaders(adminToken) }
    ));
    expect(firstCancellation.shipmentStatus).toBe('cancelled');
    const duplicateCancellation = await responseJson<Shipment>(await request.post(
      `${apiUrl}/admin/logistics/${ids.cancellationShipment}/cancel`,
      { headers: authHeaders(adminToken) }
    ));
    expect(duplicateCancellation.shipmentStatus).toBe('cancelled');

    const afterOrder = await responseJson<Order>(await request.get(`${apiUrl}/admin/orders/${ids.cancellationOrder}`, { headers: authHeaders(adminToken) }));
    const afterAnalytics = await responseJson<AnalyticsSummary>(await request.get(`${apiUrl}/admin/analytics/summary`, { headers: authHeaders(adminToken), params: { preset: 'last30' } }));
    expect(afterOrder).toMatchObject({ paymentStatus: 'paid', orderStatus: 'cancelled', fulfillmentStatus: 'cancelled', amountPaid: beforeOrder.amountPaid });
    expect(afterOrder.refunds ?? []).toEqual(beforeOrder.refunds ?? []);
    expect(afterOrder.timeline?.filter((event) => event.note?.includes('Forward shipment cancelled in Shiprocket'))).toHaveLength(1);
    expect(afterAnalytics.summary).toMatchObject({
      paidOrders: beforeAnalytics.summary.paidOrders,
      grossRevenue: beforeAnalytics.summary.grossRevenue,
      netRevenue: beforeAnalytics.summary.netRevenue,
      cancelledOrders: beforeAnalytics.summary.cancelledOrders + 1
    });
    expect(afterAnalytics.ordersByStatus.cancelled).toBe((beforeAnalytics.ordersByStatus.cancelled ?? 0) + 1);
  });
});
