// Governed by .rules v1.0
import { Types } from 'mongoose';
import { CatalogueImportModel } from '../models/catalogue-import.model.js';
import { CategoryModel } from '../models/category.model.js';
import { CollectionModel } from '../models/collection.model.js';
import { ProductModel } from '../models/product.model.js';
import { ApiError } from '../utils/api-error.js';
import { booleanFromCell, defaultMapping, numberFromCell, slugify, type CatalogueColumnMapping } from './catalogueMapper.service.js';
import { parseCatalogueCsv, type CatalogueProductGroup, type ParsedCatalogue } from './catalogueParser.service.js';
import { CatalogueHistoryService } from './catalogueHistory.service.js';
import { issuesToCsv, plainText, sanitizeDescription, validateCatalogue } from './catalogueValidator.service.js';

export type CatalogueImportMode = 'dry-run' | 'create-only' | 'update-only' | 'upsert' | 'stock-only' | 'prices-only' | 'media-only' | 'taxonomy-only';

export interface CatalogueImportOptions {
  importId?: string;
  csv?: string;
  filename?: string;
  originalFilename?: string;
  fileSize?: number;
  uploadedBy?: string;
  delimiter?: string;
  mapping?: Partial<CatalogueColumnMapping>;
  categoryMapping?: Record<string, string[] | string>;
  collectionMapping?: Record<string, string | 'ignore'>;
  importMode?: CatalogueImportMode;
  dryRun?: boolean;
  replaceImages?: boolean;
}

const placeholderImage = 'https://placehold.co/1200x1600?text=Cruisin';

const imageObject = (url: string, alt: string): Record<string, unknown> => ({ url, alt: alt || 'Cruisin product image', width: 1200, height: 1600 });

const csvSafeFilename = (filename: string): string => {
  const name = filename.split(/[\\/]/).pop()?.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'catalogue.csv';
  return name.toLowerCase().endsWith('.csv') ? name : name + '.csv';
};

const nowFilename = (): string => {
  const date = new Date().toISOString().replace('T', '_').slice(0, 16).replace(':', '-');
  return 'cruisin_catalogue_import_' + date + '.csv';
};

const ensureUniqueSlug = async (base: string, productId?: unknown): Promise<string> => {
  let slug = base;
  let suffix = 2;
  while (await ProductModel.exists({ slug, ...(productId ? { _id: { $ne: productId } } : {}) })) {
    slug = base + '-' + suffix;
    suffix += 1;
  }
  return slug;
};

const existingProductForCode = async (productCode: string): Promise<Record<string, any> | null> => {
  return ProductModel.findOne({
    $or: [
      { productCode: productCode.toUpperCase() },
      { slug: slugify(productCode) }
    ]
  }).lean<Record<string, any>>();
};

const ensureCategoryPath = async (path: string[]): Promise<{ categoryId: Types.ObjectId; categoryIds: Types.ObjectId[]; created: number }> => {
  let parent: Types.ObjectId | null = null;
  const ids: Types.ObjectId[] = [];
  let created = 0;
  const breadcrumbs: Array<{ name: string; slug: string }> = [];
  for (const name of path.filter(Boolean)) {
    const slug = slugify(name);
    const fullPath = [...breadcrumbs.map((item) => item.slug), slug].join('/');
    let category = await CategoryModel.findOne({ path: fullPath });
    if (!category) {
      category = await CategoryModel.create({
        name,
        slug,
        path: fullPath,
        parent,
        image: placeholderImage,
        imageAltText: name,
        isActive: true,
        isVisible: true,
        isPublished: true,
        showInHeader: true,
        showInMenu: true,
        showInFilters: true,
        breadcrumb: [...breadcrumbs, { name, slug }]
      });
      created += 1;
    }
    parent = category._id;
    ids.push(category._id);
    breadcrumbs.push({ name, slug });
  }
  const categoryId = ids.at(-1);
  if (!categoryId) throw new ApiError(400, 'Category mapping is required');
  return { categoryId, categoryIds: ids, created };
};

const ensureCollections = async (names: string[]): Promise<{ ids: Types.ObjectId[]; slugs: string[]; created: number }> => {
  const ids: Types.ObjectId[] = [];
  const slugs: string[] = [];
  let created = 0;
  for (const name of names) {
    const slug = slugify(name);
    let collection = await CollectionModel.findOne({ slug });
    if (!collection) {
      collection = await CollectionModel.create({ title: name, slug, description: '', imageAltText: name, isVisible: true, isPublished: true, isFeatured: false, sortOrder: 0 });
      created += 1;
    }
    ids.push(collection._id);
    slugs.push(collection.slug);
  }
  return { ids, slugs, created };
};

const categoryPathForGroup = (group: CatalogueProductGroup, overrides?: Record<string, string[] | string>): string[] => {
  const raw = group.categorySuggestion.raw;
  const override = raw ? overrides?.[raw] : undefined;
  if (Array.isArray(override)) return override.filter(Boolean);
  if (typeof override === 'string' && override.trim()) return override.split('>').map((item) => item.trim()).filter(Boolean);
  return group.categorySuggestion.path;
};

const collectionsForGroup = (group: CatalogueProductGroup, overrides?: Record<string, string | 'ignore'>): string[] => {
  const mapped = group.collections.map((name) => overrides?.[name] ?? name).filter((name) => name !== 'ignore') as string[];
  return Array.from(new Set(mapped));
};

const mergedImages = (existing: Array<Record<string, unknown>>, incoming: Array<Record<string, unknown>>, replaceImages?: boolean): Array<Record<string, unknown>> => {
  if (replaceImages) return incoming.length ? incoming : existing;
  const seen = new Set(existing.map((image) => String(image.url ?? '')));
  return [...existing, ...incoming.filter((image) => {
    const url = String(image.url ?? '');
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  })];
};

const buildProductPatch = async (group: CatalogueProductGroup, options: CatalogueImportOptions, productId?: unknown): Promise<Record<string, unknown>> => {
  const mapping = { ...defaultMapping, ...options.mapping };
  const inherited = group.inherited;
  const title = inherited[mapping.name] || group.productCode;
  const description = sanitizeDescription(inherited[mapping.description] || title);
  const textDescription = plainText(description) || title;
  const variantImageUrls = Array.from(new Set(group.variants.flatMap((variant) => variant.images)));
  const productImageUrls = group.images.length ? group.images : variantImageUrls;
  const primaryImage = productImageUrls[0] || placeholderImage;
  const images = (productImageUrls.length ? productImageUrls : [placeholderImage]).map((url) => imageObject(url, title));
  const category = await ensureCategoryPath(categoryPathForGroup(group, options.categoryMapping));
  const collections = await ensureCollections(collectionsForGroup(group, options.collectionMapping));
  const basePrice = numberFromCell(inherited[mapping.sellingPrice]) ?? group.variants.find((variant) => variant.price > 0)?.price ?? 0;
  const comparePrice = numberFromCell(inherited[mapping.mrp]) ?? group.variants.find((variant) => variant.comparePrice !== undefined)?.comparePrice;
  const visible = booleanFromCell(inherited[mapping.visibility]);
  const slug = await ensureUniqueSlug(slugify(title + '-' + group.productCode), productId);
  return {
    title,
    slug,
    description: textDescription,
    shortDescription: textDescription.slice(0, 320),
    richDescription: description.length >= 10 ? description : textDescription,
    brand: group.attributes.Brand || 'Cruisin',
    category: category.categoryId,
    categoryIds: category.categoryIds,
    collections: collections.ids,
    collectionSlugs: collections.slugs,
    images,
    hoverImage: images[1] ?? null,
    videoUrl: group.videos[0] ?? '',
    mobileVideoUrl: group.videos[1] ?? '',
    videoPosterImage: primaryImage,
    imageAltText: title,
    basePrice,
    comparePrice,
    tags: Array.from(new Set([...categoryPathForGroup(group, options.categoryMapping), ...Object.values(group.attributes).slice(0, 8)])).filter(Boolean),
    productCode: group.productCode,
    amazonAsin: inherited[mapping.amazonAsin] || '',
    costPrice: numberFromCell(inherited[mapping.costPrice]),
    gstPercent: numberFromCell(inherited[mapping.gstPercent]),
    hsnCode: inherited[mapping.hsnCode] || '',
    pickupAddress: inherited[mapping.pickupAddressCode] || '',
    returnExchangeCondition: inherited[mapping.returnExchangeCondition] || '',
    sizeGuide: inherited[mapping.sizeChart] || '',
    shippingReturns: inherited[mapping.returnExchangeCondition] || '',
    weight: numberFromCell(inherited[mapping.packagingWeight]),
    dimensions: {
      length: numberFromCell(inherited[mapping.packagingLength]),
      width: numberFromCell(inherited[mapping.packagingBreadth]),
      height: numberFromCell(inherited[mapping.packagingHeight])
    },
    gender: 'men',
    status: visible ? 'published' : 'draft',
    visibility: visible ? 'visible' : 'hidden',
    isActive: visible,
    isSale: Boolean(comparePrice && basePrice < comparePrice),
    productHighlights: Object.entries(group.attributes).slice(0, 6).map(([key, value]) => key + ': ' + value),
    seo: { metaTitle: title, metaDesc: textDescription.slice(0, 155), ogImage: primaryImage },
    rawCatalogueAttributes: group.rawAttributes,
    normalizedAttributes: group.attributes,
    productTypeRaw: inherited[mapping.productType] || '',
    categoryMappingRaw: group.categorySuggestion.path.join(' > '),
    collectionMappingRaw: group.collections.join(', '),
    catalogueSource: 'catalogue-csv',
    __createdCategories: category.created,
    __createdCollections: collections.created
  };
};

const buildVariants = (group: CatalogueProductGroup, existingVariants: Array<Record<string, unknown>> = []): { variants: Array<Record<string, unknown>>; created: number; updated: number } => {
  const existingBySku = new Map(existingVariants.map((variant) => [String(variant.sku ?? '').toUpperCase(), variant]));
  const nextBySku = new Map<string, Record<string, unknown>>();
  let created = 0;
  let updated = 0;
  for (const existing of existingVariants) nextBySku.set(String(existing.sku ?? '').toUpperCase(), existing);
  for (const variant of group.variants) {
    const sku = variant.sku.toUpperCase();
    const existing = existingBySku.get(sku);
    const image = variant.images[0] || group.images[0] || placeholderImage;
    const next = {
      ...(existing ?? {}),
      sku,
      size: variant.size || 'Free Size',
      color: variant.color || group.inherited.Colour || 'Default',
      colorHex: variant.colorHex,
      price: variant.price,
      priceOverride: variant.price,
      stock: variant.stock,
      enabled: variant.enabled,
      images: variant.images.length ? variant.images.map((url) => imageObject(url, group.inherited.Name || group.productCode)) : existing?.images ?? [imageObject(image, group.inherited.Name || group.productCode)]
    };
    if (existing) updated += 1;
    else created += 1;
    nextBySku.set(sku, next);
  }
  return { variants: Array.from(nextBySku.values()), created, updated };
};

const summarize = async (parsed: ParsedCatalogue): Promise<Record<string, unknown>> => {
  let productsToCreate = 0;
  let productsToUpdate = 0;
  let variantsToCreate = 0;
  let variantsToUpdate = 0;
  for (const group of parsed.groups) {
    const existing = await existingProductForCode(group.productCode);
    if (existing) productsToUpdate += 1;
    else productsToCreate += 1;
    const existingVariants = (existing?.variants ?? []) as Array<Record<string, unknown>>;
    const existingSkus = new Set(existingVariants.map((variant) => String(variant.sku ?? '').toUpperCase()));
    for (const variant of group.variants) {
      if (existingSkus.has(variant.sku.toUpperCase())) variantsToUpdate += 1;
      else variantsToCreate += 1;
    }
  }
  return {
    rowCount: parsed.rows.length,
    productGroupCount: parsed.groups.length,
    productsToCreate,
    productsToUpdate,
    variantsToCreate,
    variantsToUpdate,
    categoriesToReview: Array.from(new Set(parsed.groups.map((group) => group.categorySuggestion.raw + ' -> ' + group.categorySuggestion.path.join(' > ')))).filter(Boolean),
    collectionsToCreate: Array.from(new Set(parsed.groups.flatMap((group) => group.collections)))
  };
};

const assertImportableCatalogue = (parsed: ParsedCatalogue): void => {
  if (parsed.rows.length === 0) throw new ApiError(400, 'Catalogue CSV must include at least one product row');
  if (parsed.groups.length === 0) throw new ApiError(400, 'Catalogue CSV must include at least one product code');
};

export const CatalogueImportService = {
  async upload(options: CatalogueImportOptions): Promise<unknown> {
    const csv = options.csv;
    if (!csv?.trim()) throw new ApiError(400, 'CSV file is required');
    const filename = csvSafeFilename(options.filename || nowFilename());
    const parsed = parseCatalogueCsv(csv, options.mapping, options.delimiter);
    assertImportableCatalogue(parsed);
    const validation = validateCatalogue(parsed);
    const summary = await summarize(parsed);
    const doc = await CatalogueImportModel.create({
      filename,
      originalFilename: options.originalFilename || filename,
      fileSize: options.fileSize ?? Buffer.byteLength(csv),
      uploadedBy: options.uploadedBy ? new Types.ObjectId(options.uploadedBy) : null,
      status: validation.errors.length > 0 ? 'failed' : 'pending',
      rowCount: parsed.rows.length,
      productGroupCount: parsed.groups.length,
      warningsCount: validation.warnings.length,
      failedRows: validation.errors.length,
      importMode: options.importMode ?? 'upsert',
      mapping: { ...defaultMapping, ...options.mapping },
      summary: { ...summary, validation },
      errorReportData: issuesToCsv([...validation.errors, ...validation.warnings]),
      originalFileData: csv,
      completedAt: validation.errors.length > 0 ? new Date() : null
    });
    return { importId: doc._id, filename: doc.filename, parsed: this.previewPayload(parsed, validation, summary) };
  },
  async preview(options: CatalogueImportOptions): Promise<unknown> {
    const csv = await this.csvForOptions(options);
    const parsed = parseCatalogueCsv(csv, options.mapping, options.delimiter);
    assertImportableCatalogue(parsed);
    const validation = validateCatalogue(parsed);
    return this.previewPayload(parsed, validation, await summarize(parsed));
  },
  previewPayload(parsed: ParsedCatalogue, validation: ReturnType<typeof validateCatalogue>, summary: Record<string, unknown>): Record<string, unknown> {
    return {
      headers: parsed.headers,
      rowCount: parsed.rows.length,
      productGroupCount: parsed.groups.length,
      previewGroups: parsed.groups.slice(0, 20).map((group) => ({
        productCode: group.productCode,
        name: group.inherited.Name,
        variantCount: group.variants.length,
        firstSku: group.variants[0]?.sku ?? '',
        images: group.images.slice(0, 3),
        categorySuggestion: group.categorySuggestion,
        collections: group.collections,
        totalStock: group.variants.reduce((sum, variant) => sum + variant.stock, 0)
      })),
      detectedCategories: Array.from(new Map(parsed.groups.map((group) => [group.categorySuggestion.raw, group.categorySuggestion])).values()),
      detectedCollections: Array.from(new Set(parsed.groups.flatMap((group) => group.collections))),
      validation,
      summary
    };
  },
  async dryRun(options: CatalogueImportOptions): Promise<unknown> {
    const csv = await this.csvForOptions(options);
    const parsed = parseCatalogueCsv(csv, options.mapping, options.delimiter);
    assertImportableCatalogue(parsed);
    const validation = validateCatalogue(parsed);
    return { dryRun: true, canImport: validation.errors.length === 0, validation, summary: await summarize(parsed) };
  },
  async confirm(options: CatalogueImportOptions): Promise<unknown> {
    const csv = await this.csvForOptions(options);
    const parsed = parseCatalogueCsv(csv, options.mapping, options.delimiter);
    assertImportableCatalogue(parsed);
    const validation = validateCatalogue(parsed);
    if (validation.errors.length > 0) throw new ApiError(400, 'Fix catalogue errors before import');
    const importRecord = options.importId ? await CatalogueImportModel.findById(options.importId).select('+originalFileData') : null;
    if (importRecord) await importRecord.updateOne({ status: 'importing', startedAt: new Date(), importMode: options.importMode ?? 'upsert' });
    const mode = options.importMode ?? 'upsert';
    const counts = { createdProducts: 0, updatedProducts: 0, createdVariants: 0, updatedVariants: 0, createdCategories: 0, createdCollections: 0, failedRows: 0 };
    const results: Array<Record<string, unknown>> = [];
    try {
      for (const group of parsed.groups) {
        const existing = await existingProductForCode(group.productCode);
        if (mode === 'create-only' && existing) continue;
        if (mode === 'update-only' && !existing) continue;
        const patch = await buildProductPatch(group, options, existing?._id);
        counts.createdCategories += Number(patch.__createdCategories ?? 0);
        counts.createdCollections += Number(patch.__createdCollections ?? 0);
        delete patch.__createdCategories;
        delete patch.__createdCollections;
        if (mode === 'stock-only' || mode === 'prices-only' || mode === 'media-only' || mode === 'taxonomy-only') {
          if (!existing) continue;
          const variantBuild = buildVariants(group, existing.variants as unknown as Array<Record<string, unknown>>);
          const partial: Record<string, unknown> = { lastCatalogueImportId: importRecord?._id ?? null };
          if (mode === 'stock-only') partial.variants = variantBuild.variants.map((variant) => {
            const incoming = group.variants.find((item) => item.sku.toUpperCase() === String(variant.sku).toUpperCase());
            return incoming ? { ...variant, stock: incoming.stock } : variant;
          });
          if (mode === 'prices-only') partial.variants = variantBuild.variants.map((variant) => ({ ...variant, price: variant.price, priceOverride: variant.priceOverride }));
          if (mode === 'media-only') partial.images = mergedImages(existing.images as unknown as Array<Record<string, unknown>> ?? [], patch.images as Array<Record<string, unknown>>, options.replaceImages);
          if (mode === 'taxonomy-only') Object.assign(partial, { category: patch.category, categoryIds: patch.categoryIds, collections: patch.collections, collectionSlugs: patch.collectionSlugs });
          await ProductModel.findByIdAndUpdate(existing._id, partial, { runValidators: true });
          counts.updatedProducts += 1;
          counts.updatedVariants += variantBuild.updated;
          continue;
        }
        const variantBuild = buildVariants(group, existing?.variants as unknown as Array<Record<string, unknown>> | undefined);
        const payload = {
          ...patch,
          images: mergedImages(existing?.images as unknown as Array<Record<string, unknown>> ?? [], patch.images as Array<Record<string, unknown>>, options.replaceImages),
          variants: variantBuild.variants,
          lastCatalogueImportId: importRecord?._id ?? null
        };
        const product = existing ? await ProductModel.findByIdAndUpdate(existing._id, payload, { new: true, runValidators: true }) : await ProductModel.create(payload);
        if (existing) counts.updatedProducts += 1;
        else counts.createdProducts += 1;
        counts.createdVariants += variantBuild.created;
        counts.updatedVariants += variantBuild.updated;
        if (product?.collections?.length) await CollectionModel.updateMany({ _id: { $in: product.collections } }, { $addToSet: { productIds: product._id, categoryIds: product.category } });
        results.push({ productCode: group.productCode, productId: product?._id, title: product?.title, status: existing ? 'updated' : 'created' });
      }
      const summary = { ...await summarize(parsed), results };
      if (importRecord) await importRecord.updateOne({ ...counts, status: 'completed', completedAt: new Date(), warningsCount: validation.warnings.length, failedRows: 0, summary, categoryMapping: options.categoryMapping ?? {}, collectionMapping: options.collectionMapping ?? {} });
      await CatalogueHistoryService.markStale();
      return { ...counts, warningsCount: validation.warnings.length, results, summary };
    } catch (error) {
      if (importRecord) await importRecord.updateOne({ status: 'failed', completedAt: new Date(), summary: { error: error instanceof Error ? error.message : 'Import failed' } });
      throw error;
    }
  },
  async csvForOptions(options: CatalogueImportOptions): Promise<string> {
    if (options.csv?.trim()) return options.csv;
    if (!options.importId) throw new ApiError(400, 'Import id or CSV content is required');
    const record = await CatalogueImportModel.findById(options.importId).select('+originalFileData');
    if (!record?.originalFileData) throw new ApiError(404, 'Stored catalogue file not found');
    return record.originalFileData;
  },
  async errorReport(id: string): Promise<string> {
    const record = await CatalogueImportModel.findById(id);
    if (!record) throw new ApiError(404, 'Import not found');
    return record.errorReportData || 'Severity,Row,Product Code,Field,Message\n';
  }
};
