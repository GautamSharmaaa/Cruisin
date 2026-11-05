import { Schema, model } from "mongoose";
export const unitStates = [
  "QC_PENDING",
  "QC_FAILED",
  "PACKAGING_PENDING",
  "PACKED_AVAILABLE",
  "RESERVED",
  "PICKED",
  "PACKED_FOR_SHIPMENT",
  "READY_FOR_HANDOVER",
  "HANDED_OVER",
  "SHIPPED",
  "RETURN_INSPECTION",
  "QUARANTINED",
  "DAMAGED",
  "RETURNED_TO_VENDOR",
] as const;
const inspection = new Schema(
  {
    sop: String,
    sopVersion: Number,
    employee: String,
    result: String,
    defectCategory: String,
    reason: String,
    completed: [String],
    measurements: { type: Map, of: Number },
    evidence: [String],
    at: Date,
  },
  { _id: false },
);
const unitSchema = new Schema(
  {
    unitId: { type: String, required: true, unique: true, immutable: true },
    code: { type: String, required: true, unique: true, immutable: true },
    product: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      immutable: true,
    },
    variant: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
      immutable: true,
    },
    sku: { type: String, required: true, index: true, immutable: true },
    receipt: { type: String, required: true, index: true, immutable: true },
    location: { type: String, required: true },
    state: {
      type: String,
      enum: unitStates,
      default: "QC_PENDING",
      index: true,
    },
    version: { type: Number, default: 0 },
    qc: inspection,
    packaging: inspection,
    order: { type: Schema.Types.ObjectId, index: true },
    exchange: { type: Schema.Types.ObjectId, index: true },
    shipment: { type: Schema.Types.ObjectId, index: true },
    awb: String,
    history: {
      type: [
        {
          action: String,
          from: String,
          to: String,
          actor: String,
          order: String,
          shipment: String,
          at: Date,
          reason: String,
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);
unitSchema.index({ variant: 1, state: 1, createdAt: 1 });
unitSchema.index({ receipt: 1, unitId: 1 });
const receiptSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    variant: { type: String, required: true },
    quantity: { type: Number, required: true },
    location: { type: String, required: true },
    actor: { type: String, required: true },
  },
  { timestamps: true },
);
const exceptionSchema = new Schema(
  {
    type: { type: String, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    entity: { type: String, required: true, index: true },
    reporter: { type: String, required: true },
    owner: String,
    status: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "RESOLVED"],
      default: "OPEN",
      index: true,
    },
    evidence: [String],
    reason: { type: String, required: true },
    resolvedBy: String,
    resolution: String,
    version: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export const PhysicalUnitModel = model("PhysicalUnit", unitSchema);
export const UnitReceiptModel = model("UnitReceipt", receiptSchema);
export const OperationsExceptionModel = model(
  "OperationsException",
  exceptionSchema,
);
const labelConfigSchema = new Schema(
  {
    key: { type: String, unique: true, default: "default" },
    widthMm: { type: Number, required: true },
    heightMm: { type: Number, required: true },
    marginMm: { type: Number, required: true },
    dpi: { type: Number, required: true },
    orientation: {
      type: String,
      enum: ["portrait", "landscape"],
      required: true,
    },
    copies: { type: Number, required: true },
  },
  { timestamps: true },
);
export const UnitLabelConfigModel = model("UnitLabelConfig", labelConfigSchema);
const inspectionRecordSchema=new Schema({unitId:{type:String,required:true,index:true},kind:{type:String,enum:['QC','PACKAGING'],required:true},unitVersion:{type:Number,required:true},sop:{type:Schema.Types.ObjectId,required:true},sopVersion:{type:Number,required:true},employee:{type:String,required:true},snapshot:{type:Schema.Types.Mixed,required:true}},{timestamps:true});
inspectionRecordSchema.index({unitId:1,kind:1,unitVersion:1},{unique:true});
inspectionRecordSchema.index({"snapshot.evidence":1});
inspectionRecordSchema.pre('save',function(){if(!this.isNew)throw new Error('Inspection history is immutable');});
for(const hook of ['updateOne','updateMany','findOneAndUpdate','deleteOne','deleteMany','findOneAndDelete'] as const)inspectionRecordSchema.pre(hook,function(){throw new Error('Inspection history is immutable');});
export const UnitInspectionModel=model('UnitInspection',inspectionRecordSchema);
