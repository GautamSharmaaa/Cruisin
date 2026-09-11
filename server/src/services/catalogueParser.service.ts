// Governed by .rules v1.0
import { booleanFromCell, defaultMapping, inferColorHex, normalizeAttributes, numberFromCell, parseCollectionNames, suggestCategory, type CatalogueColumnMapping } from './catalogueMapper.service.js';

export interface CatalogueRow {
  rowNumber: number;
  data: Record<string, string>;
}

export interface CatalogueVariantDraft {
  rowNumber: number;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  colorHexInferred: boolean;
  images: string[];
  stock: number;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  enabled: boolean;
}

export interface CatalogueProductGroup {
  productCode: string;
  rows: CatalogueRow[];
  first: Record<string, string>;
  inherited: Record<string, string>;
  variants: CatalogueVariantDraft[];
  attributes: Record<string, string>;
  rawAttributes: Record<string, string>;
  images: string[];
  videos: string[];
  categorySuggestion: ReturnType<typeof suggestCategory>;
  collections: string[];
}

export interface ParsedCatalogue {
  headers: string[];
  rows: CatalogueRow[];
  groups: CatalogueProductGroup[];
  delimiter: string;
}

const trimBom = (value: string): string => value.replace(/^\uFEFF/, '');

export const parseDelimited = (input: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      row.push(current);
      current = '';
      continue;
    }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(current);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      current = '';
      continue;
    }
    current += char;
  }
  row.push(current);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
};

const detectDelimiter = (input: string): string => {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? '';
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  if (semicolonCount > commaCount) return ';';
  return ',';
};

const cell = (row: Record<string, string>, column: string): string => (row[column] ?? '').trim();

const inheritedValue = (rows: CatalogueRow[], column: string): string => rows.map((row) => cell(row.data, column)).find(Boolean) ?? '';

const mediaUrls = (rows: CatalogueRow[], prefix: 'Image' | 'Video', count: number): string[] => {
  const urls: string[] = [];
  for (const row of rows) {
    for (let index = 1; index <= count; index += 1) {
      const url = cell(row.data, prefix + ' ' + index);
      if (url && !urls.includes(url)) urls.push(url);
    }
  }
  return urls;
};

const variantMediaUrls = (value: string): string[] => Array.from(new Set(value.split(/[|;\n]+/).map((item) => item.trim()).filter(Boolean)));

export const parseCatalogueCsv = (input: string, mapping: Partial<CatalogueColumnMapping> = {}, delimiter?: string): ParsedCatalogue => {
  const detectedDelimiter = delimiter || detectDelimiter(input);
  const rawRows = parseDelimited(input, detectedDelimiter);
  const headers = (rawRows.shift() ?? []).map((header, index) => index === 0 ? trimBom(header.trim()) : header.trim());
  const rows = rawRows.map((values, index) => {
    const data: Record<string, string> = {};
    headers.forEach((header, headerIndex) => { data[header] = (values[headerIndex] ?? '').trim(); });
    return { rowNumber: index + 2, data };
  });
  const mergedMapping = { ...defaultMapping, ...mapping };
  const grouped = new Map<string, CatalogueRow[]>();
  for (const row of rows) {
    const productCode = cell(row.data, mergedMapping.productCode);
    if (!productCode) continue;
    grouped.set(productCode, [...(grouped.get(productCode) ?? []), row]);
  }
  const groups = Array.from(grouped.entries()).map(([productCode, groupRows]) => {
    const inherited: Record<string, string> = {};
    for (const column of Object.values(mergedMapping)) inherited[column] = inheritedValue(groupRows, column);
    const rawAttributes: Record<string, string> = {};
    for (const row of groupRows) {
      for (const [key, value] of Object.entries(row.data)) {
        if (key.startsWith('attr_') && value.trim() && !rawAttributes[key]) rawAttributes[key] = value.trim();
      }
    }
    const attributes = normalizeAttributes(rawAttributes);
    const fallbackColor = inherited[mergedMapping.color] || attributes['Primary Color'] || '';
    const explicitHexByColor = new Map<string, string>();
    for (const row of groupRows) {
      const rowColor = cell(row.data, mergedMapping.color) || fallbackColor;
      const rowHex = cell(row.data, mergedMapping.colorHex).toUpperCase();
      if (rowColor && rowHex) explicitHexByColor.set(rowColor.trim().toLowerCase(), rowHex);
    }
    const variants = groupRows.map((row) => {
      const size = cell(row.data, mergedMapping.size);
      const color = cell(row.data, mergedMapping.color) || fallbackColor;
      const explicitColorHex = cell(row.data, mergedMapping.colorHex).toUpperCase() || explicitHexByColor.get(color.trim().toLowerCase()) || '';
      const colorHexInferred = !explicitColorHex;
      const colorHex = explicitColorHex || inferColorHex(color);
      const sku = cell(row.data, mergedMapping.sku) || [productCode, size, color].filter(Boolean).join('-');
      return {
        rowNumber: row.rowNumber,
        sku,
        size,
        color,
        colorHex,
        colorHexInferred,
        images: variantMediaUrls(cell(row.data, mergedMapping.variantImages)),
        stock: numberFromCell(cell(row.data, mergedMapping.quantity)) ?? 0,
        price: numberFromCell(cell(row.data, mergedMapping.sellingPrice)) ?? numberFromCell(inherited[mergedMapping.sellingPrice]) ?? 0,
        comparePrice: numberFromCell(cell(row.data, mergedMapping.mrp)) ?? numberFromCell(inherited[mergedMapping.mrp]),
        costPrice: numberFromCell(cell(row.data, mergedMapping.costPrice)) ?? numberFromCell(inherited[mergedMapping.costPrice]),
        enabled: booleanFromCell(cell(row.data, mergedMapping.variantEnabled) || 'true')
      };
    });
    return {
      productCode,
      rows: groupRows,
      first: groupRows[0]?.data ?? {},
      inherited,
      variants,
      attributes,
      rawAttributes,
      images: mediaUrls(groupRows, 'Image', 10),
      videos: mediaUrls(groupRows, 'Video', 2),
      categorySuggestion: suggestCategory(inherited[mergedMapping.productType] ?? '', inherited[mergedMapping.name] ?? '', attributes.Type),
      collections: parseCollectionNames(inherited[mergedMapping.collections])
    };
  });
  return { headers, rows, groups, delimiter: detectedDelimiter };
};
