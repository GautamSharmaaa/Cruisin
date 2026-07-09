// Governed by .rules v1.0
import { describe, expect, it } from 'vitest';
import { catalogueColumns, suggestCategory } from './catalogueMapper.service.js';
import { parseCatalogueCsv } from './catalogueParser.service.js';
import { validateCatalogue } from './catalogueValidator.service.js';

const fixture = [
  catalogueColumns.join(','),
  [
    'CRU-TEE-BLK',
    '',
    'Black Oversized Tee',
    'CRU-TEE-BLK-S',
    '799',
    '1299',
    '200',
    '10',
    '12',
    '10',
    '3',
    '0.5',
    '5',
    'https://example.com/tee-1.jpg',
    'https://example.com/tee-2.jpg',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'mens_clothing__mens_western_wear__t_shirt',
    'size',
    'S',
    'Black',
    '<Ul><Li><Strong>Soft</Strong> tee</Li></Ul>',
    '7 day return',
    'true',
    'https://example.com/size.jpg',
    'DELHI',
    '6109',
    '',
    '',
    'Cruisin',
    'Oversized Tee',
    'Cotton',
    'Men',
    'Oversized',
    '1',
    ...Array.from({ length: catalogueColumns.length - 43 }, () => '')
  ].map((value) => '"' + value + '"').join(','),
  [
    'CRU-TEE-BLK',
    '',
    'Black Oversized Tee',
    'CRU-TEE-BLK-M',
    '799',
    '1299',
    '200',
    '4',
    '',
    '',
    '',
    '',
    '5',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'size',
    'M',
    '',
    '',
    '',
    'true',
    '',
    'DELHI',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ...Array.from({ length: catalogueColumns.length - 43 }, () => '')
  ].map((value) => '"' + value + '"').join(',')
].join('\n');

describe('catalogue parser', () => {
  it('groups rows by Product Code and creates variants per row', () => {
    const parsed = parseCatalogueCsv(fixture);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.groups).toHaveLength(1);
    expect(parsed.groups[0]?.productCode).toBe('CRU-TEE-BLK');
    expect(parsed.groups[0]?.variants).toHaveLength(2);
    expect(parsed.groups[0]?.variants.map((variant) => variant.sku)).toEqual(['CRU-TEE-BLK-S', 'CRU-TEE-BLK-M']);
  });

  it('inherits product fields across sparse variant rows', () => {
    const group = parseCatalogueCsv(fixture).groups[0];
    expect(group?.images).toEqual(['https://example.com/tee-1.jpg', 'https://example.com/tee-2.jpg']);
    expect(group?.categorySuggestion.path).toEqual(['Men', 'Clothing', 'T-Shirts']);
    expect(group?.variants[1]?.color).toBe('Black');
  });

  it('normalizes category fallbacks and validation warnings', () => {
    expect(suggestCategory('others_123__others__puja_articles', 'Performance Compression T-Shirt', '').path).toEqual(['Men', 'Clothing', 'T-Shirts']);
    const validation = validateCatalogue(parseCatalogueCsv(fixture));
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('blocks missing product codes and textual numeric fields', () => {
    const missingCodeValidation = validateCatalogue(parseCatalogueCsv(fixture.replace('CRU-TEE-BLK', '')));
    expect(missingCodeValidation.valid).toBe(false);
    expect(missingCodeValidation.errors.some((issue) => issue.field === 'Product Code')).toBe(true);

    const badNumbers = fixture.replaceAll('"799"', '"not-a-price"').replace('"10"', '"many"');
    const badNumberValidation = validateCatalogue(parseCatalogueCsv(badNumbers));
    expect(badNumberValidation.valid).toBe(false);
    expect(badNumberValidation.errors.some((issue) => issue.field === 'Selling Price')).toBe(true);
    expect(badNumberValidation.errors.some((issue) => issue.field === 'Quantity')).toBe(true);
  });

  it('blocks script content before import', () => {
    const bad = fixture.replace('<Ul><Li><Strong>Soft</Strong> tee</Li></Ul>', '<script>alert("xss")</script>');
    const validation = validateCatalogue(parseCatalogueCsv(bad));
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((issue) => issue.field === 'Description')).toBe(true);
  });
});
