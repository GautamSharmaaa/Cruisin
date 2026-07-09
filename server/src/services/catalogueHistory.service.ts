// Governed by .rules v1.0
import { CatalogueExportModel } from '../models/catalogue-export.model.js';
import { CatalogueImportModel } from '../models/catalogue-import.model.js';
import { CatalogueSettingsModel } from '../models/catalogue-settings.model.js';

export const CatalogueHistoryService = {
  async dashboard(): Promise<Record<string, unknown>> {
    const [imports, exports, settings] = await Promise.all([
      CatalogueImportModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      CatalogueExportModel.find().sort({ createdAt: -1 }).limit(10).lean(),
      this.settings()
    ]);
    const completedImports = imports.filter((item) => item.status === 'completed');
    const lastImport = imports[0] ?? null;
    const lastExport = exports[0] ?? null;
    return {
      totals: {
        imports: await CatalogueImportModel.countDocuments(),
        exports: await CatalogueExportModel.countDocuments(),
        productsImported: completedImports.reduce((sum, item) => sum + (item.createdProducts ?? 0), 0),
        productsUpdated: completedImports.reduce((sum, item) => sum + (item.updatedProducts ?? 0), 0),
        variantsImported: completedImports.reduce((sum, item) => sum + (item.createdVariants ?? 0) + (item.updatedVariants ?? 0), 0),
        categoriesCreated: completedImports.reduce((sum, item) => sum + (item.createdCategories ?? 0), 0),
        collectionsCreated: completedImports.reduce((sum, item) => sum + (item.createdCollections ?? 0), 0),
        failedRows: completedImports.reduce((sum, item) => sum + (item.failedRows ?? 0), 0)
      },
      lastImport,
      lastExport,
      settings,
      imports,
      exports
    };
  },
  async imports(): Promise<unknown[]> {
    return CatalogueImportModel.find().sort({ createdAt: -1 }).select('-originalFileData').lean();
  },
  async importById(id: string): Promise<unknown> {
    return CatalogueImportModel.findById(id).select('-originalFileData').lean();
  },
  async exports(): Promise<unknown[]> {
    return CatalogueExportModel.find().sort({ createdAt: -1 }).select('-fileData').lean();
  },
  async settings(): Promise<Record<string, unknown>> {
    const settings = await CatalogueSettingsModel.findOneAndUpdate({ singletonKey: 'catalogue-settings' }, { $setOnInsert: { singletonKey: 'catalogue-settings' } }, { upsert: true, new: true }).lean();
    return settings ?? {};
  },
  async updateSettings(patch: Record<string, unknown>): Promise<unknown> {
    return CatalogueSettingsModel.findOneAndUpdate({ singletonKey: 'catalogue-settings' }, { $set: patch, $setOnInsert: { singletonKey: 'catalogue-settings' } }, { upsert: true, new: true });
  },
  async markStale(): Promise<void> {
    await CatalogueSettingsModel.findOneAndUpdate({ singletonKey: 'catalogue-settings' }, { $set: { isCatalogueStale: true }, $setOnInsert: { singletonKey: 'catalogue-settings' } }, { upsert: true });
  }
};
