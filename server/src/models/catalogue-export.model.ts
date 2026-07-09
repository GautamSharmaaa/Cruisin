// Governed by .rules v1.0
import { Schema, model, type InferSchemaType } from 'mongoose';

const catalogueExportSchema = new Schema(
  {
    filename: { type: String, required: true, trim: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['pending', 'generating', 'completed', 'failed'], default: 'pending', index: true },
    exportType: { type: String, default: 'full' },
    filters: { type: Schema.Types.Mixed, default: {} },
    productCount: { type: Number, default: 0, min: 0 },
    rowCount: { type: Number, default: 0, min: 0 },
    fileData: { type: String, default: '', select: false },
    fileUrl: { type: String, default: '' },
    summary: { type: Schema.Types.Mixed, default: {} },
    error: { type: String, default: '' },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

catalogueExportSchema.index({ createdAt: -1 });

export type CatalogueExportDocument = InferSchemaType<typeof catalogueExportSchema>;
export const CatalogueExportModel = model('CatalogueExport', catalogueExportSchema);
