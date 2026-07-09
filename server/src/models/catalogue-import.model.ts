// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const catalogueImportSchema = new Schema(
  {
    filename: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true, trim: true },
    fileSize: { type: Number, required: true, min: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['pending', 'validating', 'importing', 'completed', 'failed'], default: 'pending', index: true },
    rowCount: { type: Number, default: 0, min: 0 },
    productGroupCount: { type: Number, default: 0, min: 0 },
    createdProducts: { type: Number, default: 0, min: 0 },
    updatedProducts: { type: Number, default: 0, min: 0 },
    createdVariants: { type: Number, default: 0, min: 0 },
    updatedVariants: { type: Number, default: 0, min: 0 },
    createdCategories: { type: Number, default: 0, min: 0 },
    createdCollections: { type: Number, default: 0, min: 0 },
    failedRows: { type: Number, default: 0, min: 0 },
    warningsCount: { type: Number, default: 0, min: 0 },
    importMode: { type: String, default: 'upsert' },
    mapping: { type: Schema.Types.Mixed, default: {} },
    categoryMapping: { type: Schema.Types.Mixed, default: {} },
    collectionMapping: { type: Schema.Types.Mixed, default: {} },
    summary: { type: Schema.Types.Mixed, default: {} },
    errorReportData: { type: String, default: '' },
    originalFileData: { type: String, default: '', select: false },
    originalFileUrl: { type: String, default: '' },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

catalogueImportSchema.index({ createdAt: -1 });

export type CatalogueImportDocument = InferSchemaType<typeof catalogueImportSchema>;
export const CatalogueImportModel = model('CatalogueImport', catalogueImportSchema);
