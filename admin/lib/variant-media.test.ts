import { describe, expect, it } from 'vitest';
import { MAX_VARIANT_IMAGES, appendOrderedUploads, moveOrderedImage, parseOrderedImageUrls, setOrderedImagesForColor } from './variant-media';

describe('ordered variant media helpers', () => {
  it('parses newline URLs in order, removes duplicates, and enforces the limit', () => {
    const value = Array.from({ length: MAX_VARIANT_IMAGES + 2 }, (_, index) => ` https://example.com/${index}.jpg `).join('\n')
      + '\nhttps://example.com/0.jpg';
    const result = parseOrderedImageUrls(value);
    expect(result).toHaveLength(MAX_VARIANT_IMAGES);
    expect(result[0]).toBe('https://example.com/0.jpg');
    expect(result.at(-1)).toBe(`https://example.com/${MAX_VARIANT_IMAGES - 1}.jpg`);
  });

  it('moves one photo without mutating the input or disturbing the other positions', () => {
    const input = ['hero', 'front', 'back', 'detail'];
    expect(moveOrderedImage(input, 3, 1)).toEqual(['hero', 'detail', 'front', 'back']);
    expect(input).toEqual(['hero', 'front', 'back', 'detail']);
    expect(moveOrderedImage(input, -1, 2)).toEqual(input);
  });

  it('keeps laptop selection order and replaces only an inherited placeholder', () => {
    expect(appendOrderedUploads(
      ['placeholder'],
      ['hero', 'front', 'back'],
      ['placeholder']
    )).toEqual(['hero', 'front', 'back']);
    expect(appendOrderedUploads(
      ['existing-hero'],
      ['front', 'back'],
      ['placeholder']
    )).toEqual(['existing-hero', 'front', 'back']);
  });

  it('synchronizes the exact photo order to every size of one color only', () => {
    const variants = [
      { sku: 'BLUE-S', color: 'Blue', images: ['old-blue'] },
      { sku: 'BLUE-M', color: ' blue ', images: ['old-blue'] },
      { sku: 'RED-S', color: 'Red', images: ['red'] }
    ];
    const result = setOrderedImagesForColor(variants, 'BLUE', ['hero', 'front', 'back']);
    expect(result.map((variant) => variant.images)).toEqual([
      ['hero', 'front', 'back'],
      ['hero', 'front', 'back'],
      ['red']
    ]);
    expect(variants[0].images).toEqual(['old-blue']);
  });
});
