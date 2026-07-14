// Governed by .rules v1.0
import type { ParsedCatalogue } from './catalogueParser.service.js';
import { defaultMapping, numberFromCell } from './catalogueMapper.service.js';

export interface CatalogueIssue {
  severity: 'error' | 'warning';
  rowNumber?: number;
  productCode?: string;
  field?: string;
  message: string;
}

export interface CatalogueValidationResult {
  errors: CatalogueIssue[];
  warnings: CatalogueIssue[];
  valid: boolean;
}

const isUrl = (value: string): boolean => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const hasScriptContent = (value: string): boolean => /<\s*script|on\w+\s*=|javascript:/i.test(value);

export const sanitizeDescription = (value: string): string => value
  .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '')
  .replace(/\son\w+="[^"]*"/gi, '')
  .replace(/\son\w+='[^']*'/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/<(?!\/?(ul|ol|li|strong|b|em|i|p|br)\b)[^>]*>/gi, '')
  .trim();

export const plainText = (value: string): string => sanitizeDescription(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const validateCatalogue = (parsed: ParsedCatalogue): CatalogueValidationResult => {
  const errors: CatalogueIssue[] = [];
  const warnings: CatalogueIssue[] = [];
  const skuRows = new Map<string, number[]>();
  const combinationRows = new Map<string, number[]>();
  const inferredColors = new Set<string>();
  for (const row of parsed.rows) {
    if (!(row.data[defaultMapping.productCode] ?? '').trim()) {
      errors.push({ severity: 'error', rowNumber: row.rowNumber, field: defaultMapping.productCode, message: 'Missing Product Code' });
    }
  }
  for (const group of parsed.groups) {
    const name = group.inherited.Name;
    if (!group.productCode) errors.push({ severity: 'error', message: 'Missing Product Code' });
    if (!name) errors.push({ severity: 'error', productCode: group.productCode, field: 'Name', message: 'Missing product name' });
    if (!group.categorySuggestion.path.length) warnings.push({ severity: 'warning', productCode: group.productCode, field: 'Product Type', message: 'Unknown category mapping' });
    if (hasScriptContent(group.inherited.Description ?? '')) errors.push({ severity: 'error', productCode: group.productCode, field: 'Description', message: 'Description contains unsafe script content' });
    for (const image of group.images) {
      if (!isUrl(image)) warnings.push({ severity: 'warning', productCode: group.productCode, field: 'Image', message: 'Invalid image URL: ' + image });
    }
    for (const video of group.videos) {
      if (!isUrl(video)) warnings.push({ severity: 'warning', productCode: group.productCode, field: 'Video', message: 'Invalid video URL: ' + video });
    }
    for (const variant of group.variants) {
      const row = group.rows.find((item) => item.rowNumber === variant.rowNumber);
      const rawPrice = (row?.data[defaultMapping.sellingPrice] || group.inherited[defaultMapping.sellingPrice] || '').trim();
      const rawMrp = (row?.data[defaultMapping.mrp] || group.inherited[defaultMapping.mrp] || '').trim();
      const rawStock = (row?.data[defaultMapping.quantity] || group.inherited[defaultMapping.quantity] || '').trim();
      const parsedPrice = numberFromCell(rawPrice);
      const parsedMrp = numberFromCell(rawMrp);
      const parsedStock = numberFromCell(rawStock);
      if (!variant.sku) warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Sku Id', message: 'SKU missing; a stable SKU will be generated' });
      if (!variant.size) warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Size', message: 'Variant size is missing' });
      if (!variant.color) warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Colour', message: 'Variant color is missing' });
      if (!/^#[0-9A-F]{6}$/.test(variant.colorHex)) errors.push({ severity: 'error', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Colour HEX', message: 'Color visual value must be a six-digit HEX code such as #000000' });
      if (variant.colorHexInferred) {
        const inferredKey = group.productCode + '|' + variant.color.toLowerCase();
        if (!inferredColors.has(inferredKey)) {
          inferredColors.add(inferredKey);
          warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Colour HEX', message: `Missing color HEX; inferred ${variant.colorHex} from ${variant.color || 'the default color'}` });
        }
      }
      for (const image of variant.images) {
        if (!isUrl(image)) warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Variant Image URLs', message: 'Invalid variant image URL: ' + image });
      }
      if (!rawPrice || parsedPrice === undefined || parsedPrice < 0) errors.push({ severity: 'error', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Selling Price', message: 'Invalid selling price' });
      if (rawMrp && (parsedMrp === undefined || parsedMrp < 0)) errors.push({ severity: 'error', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'MRP', message: 'Invalid MRP' });
      if (variant.comparePrice !== undefined && variant.price > variant.comparePrice) warnings.push({ severity: 'warning', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Selling Price', message: 'Selling price is greater than MRP' });
      if (!rawStock || parsedStock === undefined || !Number.isInteger(parsedStock) || parsedStock < 0) errors.push({ severity: 'error', rowNumber: variant.rowNumber, productCode: group.productCode, field: 'Quantity', message: 'Invalid stock quantity' });
      const key = variant.sku.toUpperCase();
      skuRows.set(key, [...(skuRows.get(key) ?? []), variant.rowNumber]);
      const combination = `${group.productCode.toUpperCase()}|${variant.color.trim().toLowerCase()}|${variant.size.trim().toLowerCase()}`;
      combinationRows.set(combination, [...(combinationRows.get(combination) ?? []), variant.rowNumber]);
    }
  }
  for (const [sku, rows] of skuRows) {
    if (sku && rows.length > 1) errors.push({ severity: 'error', field: 'Sku Id', message: 'Duplicate SKU ' + sku + ' appears on rows ' + rows.join(', ') });
  }
  for (const [combination, rows] of combinationRows) {
    if (rows.length > 1) errors.push({ severity: 'error', field: 'Colour / Size', message: 'Duplicate color-size combination ' + combination.split('|').slice(1).join(' / ') + ' appears on rows ' + rows.join(', ') });
  }
  return { errors, warnings, valid: errors.length === 0 };
};

export const issuesToCsv = (issues: CatalogueIssue[]): string => {
  const quote = (value: unknown): string => {
    const text = String(value ?? '');
    const safe = typeof value === 'string' && (/^[\t\r]/.test(text) || /^[ ]*[=+\-@]/.test(text)) ? "'" + text : text;
    return '"' + safe.replace(/"/g, '""') + '"';
  };
  return [
    ['Severity', 'Row', 'Product Code', 'Field', 'Message'].map(quote).join(','),
    ...issues.map((issue) => [issue.severity, issue.rowNumber ?? '', issue.productCode ?? '', issue.field ?? '', issue.message].map(quote).join(','))
  ].join('\n');
};
