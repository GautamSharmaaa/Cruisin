// Governed by .rules v1.0
import PDFDocument from 'pdfkit';
import { ExchangeRequestModel } from '../../models/exchange-request.model.js';
import { OrderModel } from '../../models/order.model.js';
import { ProductModel } from '../../models/product.model.js';
import { ShipmentModel } from '../../models/shipment.model.js';
import { ApiError } from '../../utils/api-error.js';

const money = (value: number): string => `INR ${value.toFixed(2)}`;

export const ReplacementInvoiceService = {
  async generate(shipmentId: string): Promise<{ buffer: Buffer; filename: string }> {
    const shipment = await ShipmentModel.findById(shipmentId).lean();
    if (!shipment || shipment.shipmentType !== 'exchange_replacement') throw new ApiError(404, 'Replacement shipment not found');
    const order = await OrderModel.findById(shipment.order).lean();
    if (!order) throw new ApiError(404, 'Original order not found');
    const requests = await ExchangeRequestModel.find({ replacementShipment: shipment._id })
      .sort({ createdAt: 1 })
      .lean();
    if (!requests.length) throw new ApiError(409, 'No replacement products are linked to this shipment');
    if (requests.some((request) => !request.originalItem)) throw new ApiError(409, 'Replacement product details are incomplete');

    const items = await Promise.all(requests.map(async (request) => {
      const originalItem = request.originalItem!;
      const product = await ProductModel.findById(originalItem.product).select('title variants').lean();
      if (!product) throw new ApiError(409, 'Replacement product no longer exists');
      const variant = product.variants?.find((candidate) => String(candidate._id) === String(request.requestedVariant));
      return {
        name: product.title ?? 'Replacement product',
        sku: request.requestedSku,
        quantity: originalItem.quantity,
        unitPrice: variant?.priceOverride ?? variant?.price ?? 0
      };
    }));
    const merchandiseValue = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const exchangeHandlingFee = Math.max(0, ...requests
      .filter((request) => request.handlingFeePaymentStatus === 'paid')
      .map((request) => request.handlingFee ?? 0));
    const address = order.shippingAddress;
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `No-charge replacement ${order.orderNumber}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const complete = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.font('Helvetica-Bold').fontSize(24).text('CRUISIN', 48, 48, { width: 145 });
    doc.fontSize(17).text('REPLACEMENT INVOICE / DELIVERY NOTE', 210, 53, { width: 337, align: 'right' });
    doc.y = 112;
    doc.font('Helvetica').fontSize(10);
    doc.text(`Original order: ${order.orderNumber}`);
    doc.text(`Replacement reference: ${shipment.sourceOrderId}`);
    doc.text(`AWB: ${shipment.awb ?? 'Pending'}`);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text('DELIVER TO');
    doc.font('Helvetica').text(address.fullName);
    doc.text([address.line1, address.line2, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', '));
    doc.text(address.phone || '');
    doc.moveDown(1.5);

    const startY = doc.y;
    doc.font('Helvetica-Bold').text('ITEM', 48, startY).text('QTY', 330, startY).text('MRP', 385, startY).text('ADJUSTMENT', 460, startY);
    doc.moveTo(48, startY + 16).lineTo(547, startY + 16).stroke();
    doc.font('Helvetica');
    let y = startY + 28;
    for (const item of items) {
      doc.text(`${item.name}\n${item.sku}`, 48, y, { width: 270 });
      doc.text(String(item.quantity), 330, y);
      doc.text(money(item.unitPrice * item.quantity), 385, y, { width: 70 });
      doc.text(`-${money(item.unitPrice * item.quantity)}`, 460, y, { width: 87, align: 'right' });
      y += 42;
    }
    doc.moveTo(330, y).lineTo(547, y).stroke();
    y += 12;
    doc.font('Helvetica').text('Merchandise value', 330, y).text(money(merchandiseValue), 450, y, { width: 97, align: 'right' });
    y += 18;
    doc.text('Already paid adjustment', 330, y).text(`-${money(merchandiseValue)}`, 450, y, { width: 97, align: 'right' });
    y += 18;
    doc.text('Prepaid exchange fee', 330, y).text(money(exchangeHandlingFee), 450, y, { width: 97, align: 'right' });
    y += 24;
    doc.font('Helvetica-Bold').fontSize(14).text('INVOICE TOTAL', 330, y).text(money(exchangeHandlingFee), 450, y, { width: 97, align: 'right' });
    y += 20;
    doc.fontSize(12).text('AMOUNT DUE', 330, y).text('INR 0.00', 450, y, { width: 97, align: 'right' });
    y += 48;
    doc.font('Helvetica').fontSize(10).text('Exchanged products: the merchandise value was paid on the original order and is fully adjusted above. The INR 100.00 exchange handling fee was prepaid. No payment or COD collection is due on delivery.', 48, y, { width: 499, lineGap: 3 });
    doc.end();
    return { buffer: await complete, filename: `replacement-${order.orderNumber}.pdf` };
  }
};
