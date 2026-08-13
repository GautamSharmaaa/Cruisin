// Governed by .rules v1.0
import { Types } from 'mongoose';
import { ProductModel } from '../models/product.model.js';
import { parseDelimited } from './catalogueParser.service.js';
import { ApiError } from '../utils/api-error.js';

const headers = ['Product ID', 'Product Code', 'Product', 'Manufacturing', 'Packaging', 'Marketing', 'Handling', 'Other', 'Total Cost'] as const;
const amount = (value: string | undefined, row: number, field: string): number => {
  const parsed = Number(String(value ?? '').replaceAll(',', '').trim());
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) throw new ApiError(400, `Row ${row}: ${field} must be a non-negative amount`);
  return Math.round(parsed * 100) / 100;
};

export const ProductCostCsvService = {
  async rows(): Promise<Array<Record<string, string | number>>> {
    const products = await ProductModel.find({ isArchived: { $ne: true } }).select('title productCode costPrice costBreakdown').sort({ title: 1 }).lean();
    return products.map((product) => ({
      'Product ID': String(product._id), 'Product Code': product.productCode ?? '', 'Product': product.title,
      'Manufacturing': product.costBreakdown?.manufacturing ?? product.costPrice ?? 0, 'Packaging': product.costBreakdown?.packaging ?? 0,
      'Marketing': product.costBreakdown?.marketing ?? 0, 'Handling': product.costBreakdown?.handling ?? 0, 'Other': product.costBreakdown?.other ?? 0,
      'Total Cost': product.costPrice ?? 0
    }));
  },

  async import(csv: string): Promise<{ updated: number }> {
    if (!csv.trim()) throw new ApiError(400, 'Product cost CSV is empty');
    if (Buffer.byteLength(csv) > 2_000_000) throw new ApiError(413, 'Product cost CSV must be 2 MB or smaller');
    const parsed = parseDelimited(csv, ',');
    const csvHeaders = parsed[0]?.map((cell) => cell.trim()) ?? [];
    for (const required of ['Product ID', 'Manufacturing', 'Packaging', 'Marketing', 'Handling', 'Other']) if (!csvHeaders.includes(required)) throw new ApiError(400, `Missing required column: ${required}`);
    const records = parsed.slice(1).filter((row) => row.some((cell) => cell.trim())).map((cells, index) => Object.fromEntries(csvHeaders.map((header, column) => [header, cells[column]?.trim() ?? ''])) as Record<string, string>);
    if (!records.length) throw new ApiError(400, 'Product cost CSV has no product rows');
    if (records.length > 5_000) throw new ApiError(400, 'Product cost CSV supports up to 5,000 rows');
    const seen = new Set<string>();
    const updates = records.map((record, index) => {
      const row = index + 2;
      const productId = record['Product ID'];
      if (!Types.ObjectId.isValid(productId)) throw new ApiError(400, `Row ${row}: invalid Product ID`);
      if (seen.has(productId)) throw new ApiError(400, `Row ${row}: duplicate Product ID`);
      seen.add(productId);
      const costBreakdown = {
        manufacturing: amount(record.Manufacturing, row, 'Manufacturing'), packaging: amount(record.Packaging, row, 'Packaging'),
        marketing: amount(record.Marketing, row, 'Marketing'), handling: amount(record.Handling, row, 'Handling'), other: amount(record.Other, row, 'Other')
      };
      return { productId, costBreakdown, costPrice: Math.round(Object.values(costBreakdown).reduce((sum, value) => sum + value, 0) * 100) / 100 };
    });
    const found = await ProductModel.countDocuments({ _id: { $in: updates.map((update) => update.productId) }, isArchived: { $ne: true } });
    if (found !== updates.length) throw new ApiError(400, 'One or more Product IDs are missing or archived; no costs were changed');
    const result = await ProductModel.bulkWrite(updates.map((update) => ({ updateOne: { filter: { _id: update.productId }, update: { $set: { costBreakdown: update.costBreakdown, costPrice: update.costPrice } } } })), { ordered: true });
    return { updated: result.modifiedCount };
  },
  headers
};
