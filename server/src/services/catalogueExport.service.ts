// Governed by .rules v1.0
import { Types } from 'mongoose';
import { CatalogueExportModel } from '../models/catalogue-export.model.js';
import { CatalogueSettingsModel } from '../models/catalogue-settings.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { ProductModel } from '../models/product.model.js';
import { catalogueColumns, slugify } from './catalogueMapper.service.js';

export interface CatalogueExportOptions {
  generatedBy?: string;
  exportType?: 'full' | 'visible' | 'draft' | 'stock' | 'price-list';
  category?: string;
  collection?: string;
  updatedFrom?: string;
  updatedTo?: string;
}

const quote = (value: unknown): string => {
  const text = String(value ?? '');
  const safe = typeof value === 'string' && (/^[\t\r]/.test(text) || /^[ ]*[=+\-@]/.test(text)) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};

const dateFilename = (): string => new Date().toISOString().replace('T', '_').slice(0, 16).replace(':', '-');

const productTypeFromCategory = (category: { path?: string; slug?: string } | null | undefined): string => (category?.path ?? category?.slug ?? '').replace(/\//g, '__') || '';

export const rowForVariant = (product: Record<string, any>, variant: Record<string, any>, category: Record<string, any> | null): Record<string, unknown> => {
  const images = product.images ?? [];
  const attributes = product.normalizedAttributes ?? {};
  const row: Record<string, unknown> = {
    'Product Code': product.productCode || product.slug || '',
    'Amazon ASIN': product.amazonAsin ?? '',
    Name: product.title ?? '',
    'Sku Id': variant.sku ?? '',
    'Selling Price': variant.priceOverride ?? variant.price ?? product.basePrice ?? '',
    MRP: product.comparePrice ?? '',
    'Cost Price': product.costPrice ?? '',
    Quantity: variant.stock ?? 0,
    'Packaging Length (in cm)': product.dimensions?.length ?? '',
    'Packaging Breadth (in cm)': product.dimensions?.width ?? '',
    'Packaging Height (in cm)': product.dimensions?.height ?? '',
    'Packaging Weight (in kg)': product.weight ?? '',
    'GST %': product.gstPercent ?? '',
    'Video 1': product.videoUrl ?? '',
    'Video 2': product.mobileVideoUrl ?? '',
    'Product Type': product.productTypeRaw || productTypeFromCategory(category),
    'Size Type': 'size',
    Size: variant.size ?? '',
    Colour: variant.color ?? '',
    'Colour HEX': variant.colorHex ?? '',
    'Variant Image URLs': (variant.images ?? []).map((image: { url?: string }) => image.url ?? '').filter(Boolean).join(' | '),
    'Variant Enabled': variant.enabled === false ? 'false' : 'true',
    Description: product.richDescription ?? product.description ?? '',
    'Return/Exchange Condition': product.returnExchangeCondition ?? product.shippingReturns ?? '',
    Visibility: product.isActive !== false && product.visibility !== 'hidden' ? 'true' : 'false',
    'Size Chart': product.sizeGuide ?? '',
    'Pickup Address Code': product.pickupAddress ?? '',
    'HSN Code': product.hsnCode ?? '',
    'Customisation Id': '',
    'Associated Pixel': ''
  };
  for (let index = 1; index <= 10; index += 1) row['Image ' + index] = images[index - 1]?.url ?? '';
  for (const [key, value] of Object.entries(attributes)) row['attr_' + key] = value;
  row.attr_Brand = product.brand ?? 'Cruisin';
  row.attr_collection = (product.collectionSlugs ?? []).join(', ');
  return row;
};

export const CatalogueExportService = {
  async generate(options: CatalogueExportOptions): Promise<unknown> {
    const filename = 'cruisin_catalogue_' + dateFilename() + '.csv';
    const exportRecord = await CatalogueExportModel.create({ filename, generatedBy: options.generatedBy ? new Types.ObjectId(options.generatedBy) : null, status: 'generating', exportType: options.exportType ?? 'full', filters: options });
    try {
      const query: Record<string, unknown> = { isArchived: { $ne: true } };
      if (options.exportType === 'visible') Object.assign(query, { isActive: true, visibility: 'visible', status: 'published' });
      if (options.exportType === 'draft') query.$or = [{ isActive: false }, { visibility: 'hidden' }, { status: 'draft' }];
      if (options.updatedFrom || options.updatedTo) query.updatedAt = { ...(options.updatedFrom ? { $gte: new Date(options.updatedFrom) } : {}), ...(options.updatedTo ? { $lte: new Date(options.updatedTo) } : {}) };
      if (options.category) {
        const category = await CategoryModel.findOne({ $or: [{ slug: slugify(options.category) }, { path: options.category }, ...(Types.ObjectId.isValid(options.category) ? [{ _id: options.category }] : [])] }).select('_id');
        if (category) query.$or = [{ category: category._id }, { categoryIds: category._id }];
      }
      if (options.collection) {
        const collection = await CollectionModel.findOne({ $or: [{ slug: slugify(options.collection) }, ...(Types.ObjectId.isValid(options.collection) ? [{ _id: options.collection }] : [])] }).select('_id');
        if (collection) query.collections = collection._id;
      }
      const products = await ProductModel.find(query).populate('category').populate('collections').lean();
      const rows: Record<string, unknown>[] = [];
      for (const product of products as Array<Record<string, any>>) {
        const variants = product.variants?.length ? product.variants : [{ sku: product.productCode, size: '', color: '', stock: 0, price: product.basePrice }];
        for (const variant of variants) rows.push(rowForVariant(product, variant, product.category ?? null));
      }
      const headers = Array.from(new Set([...catalogueColumns, ...rows.flatMap((row) => Object.keys(row).filter((key) => key.startsWith('attr_')))]));
      const csv = [headers.map(quote).join(','), ...rows.map((row) => headers.map((header) => quote(row[header])).join(','))].join('\n');
      await exportRecord.updateOne({ status: 'completed', completedAt: new Date(), productCount: products.length, rowCount: rows.length, fileData: csv, summary: { headers: headers.length, rows: rows.length } });
      await CatalogueSettingsModel.findOneAndUpdate({ singletonKey: 'catalogue-settings' }, { $set: { latestExportId: exportRecord._id, isCatalogueStale: false, lastGeneratedAt: new Date() }, $setOnInsert: { singletonKey: 'catalogue-settings' } }, { upsert: true });
      return { exportId: exportRecord._id, filename, productCount: products.length, rowCount: rows.length, csv };
    } catch (error) {
      await exportRecord.updateOne({ status: 'failed', completedAt: new Date(), error: error instanceof Error ? error.message : 'Export failed' });
      throw error;
    }
  },
  async download(id: string): Promise<{ filename: string; csv: string }> {
    const record = await CatalogueExportModel.findById(id).select('+fileData');
    if (!record?.fileData) throw new Error('Export file not found');
    return { filename: record.filename, csv: record.fileData };
  }
};
