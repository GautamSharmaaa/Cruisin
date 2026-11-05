import type { PipelineStage, ClientSession } from "mongoose";
import {
  SopDocumentModel,
  SopVersionModel,
} from "../models/sop-document.model.js";
export const publishedSopPipeline = (role: string): PipelineStage[] => [
  {
    $lookup: {
      from: SopDocumentModel.collection.name,
      localField: "document",
      foreignField: "_id",
      as: "current",
    },
  },
  { $unwind: "$current" },
  {
    $match: {
      $expr: { $eq: ["$version", "$current.publishedVersion"] },
      "current.status": { $ne: "ARCHIVED" },
      $or: [{ "snapshot.roles": { $size: 0 } }, { "snapshot.roles": role }],
    },
  },
  { $replaceRoot: { newRoot: "$snapshot" } },
];
export const publishedSop = async (
  id: string,
  role: string,
  session?: ClientSession,
) => {
  const current = await SopDocumentModel.findById(id).session(session ?? null);
  if (
    !current ||
    current.status === "ARCHIVED" ||
    current.publishedVersion === undefined
  )
    return null;
  const version = await SopVersionModel.findOne({
    document: id,
    version: current.publishedVersion,
  }).session(session ?? null);
  if (!version) return null;
  const snapshot = SopDocumentModel.hydrate(version.snapshot);
  if (
    snapshot.roles.length &&
    !snapshot.roles.includes(role as (typeof snapshot.roles)[number])
  )
    return null;
  return snapshot;
};
