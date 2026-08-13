// Governed by .rules v1.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const productModel = vi.hoisted(() => ({ countDocuments: vi.fn(), bulkWrite: vi.fn(), find: vi.fn() }));
vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));

import { ProductCostCsvService } from './product-cost-csv.service.js';

const validCsv = ['Product ID,Product Code,Product,Manufacturing,Packaging,Marketing,Handling,Other,Total Cost', '66b000000000000000000101,TEE,Example Tee,300,25,40,10,5,380'].join('\n');

describe('product cost CSV import', () => {
  beforeEach(() => { vi.clearAllMocks(); productModel.countDocuments.mockResolvedValue(1); productModel.bulkWrite.mockResolvedValue({ modifiedCount: 1 }); });

  it('validates the entire sheet and calculates total cost before updating', async () => {
    await expect(ProductCostCsvService.import(validCsv)).resolves.toEqual({ updated: 1 });
    expect(productModel.bulkWrite).toHaveBeenCalledWith([expect.objectContaining({ updateOne: expect.objectContaining({ update: { $set: { costBreakdown: { manufacturing: 300, packaging: 25, marketing: 40, handling: 10, other: 5 }, costPrice: 380 } } }) })], { ordered: true });
  });

  it('rejects invalid amounts without writing any products', async () => {
    await expect(ProductCostCsvService.import(validCsv.replace(',300,25,', ',-1,25,'))).rejects.toThrow('Manufacturing must be a non-negative amount');
    expect(productModel.bulkWrite).not.toHaveBeenCalled();
  });

  it('rejects unknown product ids without partially updating the sheet', async () => {
    productModel.countDocuments.mockResolvedValue(0);
    await expect(ProductCostCsvService.import(validCsv)).rejects.toThrow('no costs were changed');
    expect(productModel.bulkWrite).not.toHaveBeenCalled();
  });
});
