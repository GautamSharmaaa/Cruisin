import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productModel, categoryModel, collectionModel, historyService, queryChain } = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
    lean: vi.fn()
  };
  Object.values(chain).forEach((method) => method.mockReturnValue(chain));
  return {
    queryChain: chain,
    productModel: { find: vi.fn(), countDocuments: vi.fn(), findOne: vi.fn() },
    categoryModel: { findOne: vi.fn(), find: vi.fn() },
    collectionModel: { findOne: vi.fn() },
    historyService: { markStale: vi.fn() }
  };
});

vi.mock('../models/product.model.js', () => ({ ProductModel: productModel }));
vi.mock('../models/category.model.js', () => ({ CategoryModel: categoryModel }));
vi.mock('../models/collection.model.js', () => ({ CollectionModel: collectionModel }));
vi.mock('./catalogueHistory.service.js', () => ({ CatalogueHistoryService: historyService }));

import { ProductService, type ProductFilters } from './product.service.js';

const filters = (overrides: Partial<ProductFilters> = {}): ProductFilters => ({
  availability: 'all',
  sort: 'newest',
  page: 1,
  limit: 24,
  ...overrides
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.values(queryChain).forEach((method) => method.mockReturnValue(queryChain));
  productModel.find.mockReturnValue(queryChain);
  productModel.countDocuments.mockResolvedValue(1);
  queryChain.lean.mockResolvedValue([]);
});

describe('ProductService public variant filtering', () => {
  it('matches tag slugs against display-name tags without case sensitivity', async () => {
    await ProductService.list(filters({ tags: 'latest-drop,joggers' }));

    const query = productModel.find.mock.calls[0]?.[0] as { tags: { $in: RegExp[] } };
    expect(query.tags.$in.some((matcher) => matcher.test('Latest Drop'))).toBe(true);
    expect(query.tags.$in.some((matcher) => matcher.test('Joggers'))).toBe(true);
  });

  it('uses a literal case-insensitive substring across public search fields', async () => {
    await ProductService.list(filters({ q: 'qa-catalogue.multi' }));

    const query = productModel.find.mock.calls[0]?.[0] as { $and: Array<{ $or?: Array<Record<string, RegExp>> }> };
    const search = query.$and.find((item) => item.$or)?.$or ?? [];
    expect(search).toHaveLength(4);
    const titleExpression = search[0]?.title;
    expect(titleExpression).toBeInstanceOf(RegExp);
    expect(titleExpression.test('QA-CATALOGUE.MULTI tee')).toBe(true);
    expect(titleExpression.test('QA-CATALOGUEXMULTI tee')).toBe(false);
    expect(titleExpression.test('qa-catalogue.multi tee')).toBe(true);
  });

  it('requires color and size to match the same enabled variant case-insensitively', async () => {
    await ProductService.list(filters({ color: 'black', size: 'm' }));

    const query = productModel.find.mock.calls[0]?.[0] as { variants: { $elemMatch: Record<string, unknown> } };
    const match = query.variants.$elemMatch;
    expect(match.enabled).toEqual({ $ne: false });
    expect(match.color).toBeInstanceOf(RegExp);
    expect(match.size).toBeInstanceOf(RegExp);
    expect((match.color as RegExp).test('Black')).toBe(true);
    expect((match.size as RegExp).test('M')).toBe(true);
    expect(query).not.toHaveProperty('variants.color');
    expect(query).not.toHaveProperty('variants.size');
  });

  it('applies in-stock availability to the matching color-size combination', async () => {
    await ProductService.list(filters({ color: 'White', size: 'XL', availability: 'in-stock' }));

    const query = productModel.find.mock.calls[0]?.[0] as { variants: { $elemMatch: Record<string, unknown> } };
    expect(query.variants.$elemMatch.stock).toEqual({ $gt: 0 });
  });

  it('removes disabled variant metadata from public results', async () => {
    queryChain.lean.mockResolvedValue([{
      title: 'QA product',
      variants: [
        { sku: 'QA-BLK-M', enabled: true },
        { sku: 'QA-HIDDEN', enabled: false }
      ]
    }]);

    const result = await ProductService.list(filters());
    expect((result.items[0] as { variants: Array<{ sku: string }> }).variants).toEqual([{ sku: 'QA-BLK-M', enabled: true }]);
  });
});
