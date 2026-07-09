// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const catalogueSettingsSchema = new Schema(
  {
    singletonKey: { type: String, default: 'catalogue-settings', unique: true },
    autoGenerateOnProductUpdate: { type: Boolean, default: false },
    latestExportId: { type: Schema.Types.ObjectId, ref: 'CatalogueExport', default: null },
    isCatalogueStale: { type: Boolean, default: true },
    lastGeneratedAt: { type: Date, default: null },
    defaultExportType: { type: String, default: 'full' },
    defaultImportMode: { type: String, default: 'upsert' }
  },
  { timestamps: true }
);

export type CatalogueSettingsDocument = InferSchemaType<typeof catalogueSettingsSchema>;
export const CatalogueSettingsModel = model('CatalogueSettings', catalogueSettingsSchema);
