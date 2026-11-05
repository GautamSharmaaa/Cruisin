import { PhysicalUnitModel } from "../models/physical-unit.model.js";
import { publishedSop } from "./sop-access.service.js";
import { literalSearch } from "../utils/literal-search.js";
import type { FilterQuery, ClientSession } from "mongoose";
import type { TaskStatus } from "@cruisin/contracts";
import { authorizeAttachments } from "./media/media.service.js";
import { z } from "zod";
import { EmployeeTaskModel } from "../models/employee-task.model.js";
import { EmployeeModel } from "../models/employee.model.js";
import { ApprovalRequestModel } from "../models/approval-request.model.js";
import { SopDocumentModel } from "../models/sop-document.model.js";
import { ProductModel } from "../models/product.model.js";
import { OrderModel } from "../models/order.model.js";
import { ApiError } from "../utils/api-error.js";
import { withMongoTransaction } from "../utils/mongo-transaction.js";
import {
  audit,
  notify,
  permit,
  type OperationsContext,
} from "./operations-context.js";
import {
  taskCreateSchema,
  taskUpdateSchema,
  type OperationPage,
} from "../validators/operations.validator.js";
export const taskTransitions: Record<TaskStatus, readonly TaskStatus[]> = {
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REWORK_REQUIRED"],
  APPROVED: ["COMPLETED"],
  COMPLETED: [],
  REWORK_REQUIRED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};
const scope = (ctx: OperationsContext): Record<string, unknown> =>
  ctx.actor.kind === "admin" || ctx.actor.permissions.includes("tasks.approve")
    ? {}
    : ctx.actor.permissions.includes("tasks.assign")
      ? { $or: [{ assignees: ctx.actor.id }, { creator: ctx.actor.id }] }
      : { assignees: ctx.actor.id };
const requiredTask = async (
  ctx: OperationsContext,
  id: string,
  session?: ClientSession,
) => {
  permit(ctx, "tasks.view");
  const task = await EmployeeTaskModel.findOne({
    _id: id,
    ...scope(ctx),
  }).session(session ?? null);
  if (!task) throw new ApiError(404, "Task not found");
  return task;
};
const validateReferences = async (
  input: Partial<z.infer<typeof taskCreateSchema>>,
  session?: ClientSession,
): Promise<void> => {
  if (
    input.assignees &&
    (await EmployeeModel.countDocuments({
      _id: { $in: input.assignees },
      active: true,
    }).session(session ?? null)) !== new Set(input.assignees).size
  )
    throw new ApiError(400, "Assignees must be active employees");
  if (
    input.assignees &&
    new Set(input.assignees).size !== input.assignees.length
  )
    throw new ApiError(400, "Duplicate assignee");
  if (
    input.sop &&
    !(await SopDocumentModel.exists({
      _id: input.sop,
      status: "PUBLISHED",
    }).session(session ?? null))
  )
    throw new ApiError(400, "SOP must be published");
  if (
    input.order &&
    !(await OrderModel.exists({ _id: input.order }).session(session ?? null))
  )
    throw new ApiError(400, "Order not found");
  if (
    input.dependencies &&
    (await EmployeeTaskModel.countDocuments({
      _id: { $in: input.dependencies },
    }).session(session ?? null)) !== new Set(input.dependencies).size
  )
    throw new ApiError(400, "Dependency not found");
  if (
    input.unit &&
    !(await PhysicalUnitModel.exists({ unitId: input.unit }).session(
      session ?? null,
    ))
  )
    throw new ApiError(400, "Linked unit not found");
  if (
    input.sku &&
    !(await ProductModel.exists({
      "variants.sku": input.sku.toUpperCase(),
    }).session(session ?? null))
  )
    throw new ApiError(400, "Linked SKU not found");
  if (input.sop && input.assignees) {
    for (const e of await EmployeeModel.find({
      _id: { $in: input.assignees },
    }).session(session ?? null))
      if (!(await publishedSop(input.sop, e.role, session)))
        throw new ApiError(400, "An assignee cannot access the linked SOP");
  }
  if (
    input.checklist &&
    new Set(input.checklist.map((c) => c.id)).size !== input.checklist.length
  )
    throw new ApiError(400, "Checklist identifiers must be unique");
};
export const EmployeeTaskService = {
  async summary(ctx: OperationsContext) {
    permit(ctx, "tasks.view");
    const match = scope(ctx);
    const [total, active, overdue] = await Promise.all([
      EmployeeTaskModel.countDocuments(match),
      EmployeeTaskModel.countDocuments({
        ...match,
        status: { $nin: ["COMPLETED", "CANCELLED"] },
      }),
      EmployeeTaskModel.countDocuments({
        ...match,
        status: { $nin: ["COMPLETED", "CANCELLED"] },
        dueAt: { $lt: new Date() },
      }),
    ]);
    return { total, active, overdue };
  },

  async list(ctx: OperationsContext, page: OperationPage): Promise<unknown> {
    permit(ctx, "tasks.view");
    const filter: FilterQuery<unknown> = { ...scope(ctx) };
    if (page.status) filter.status = page.status;
    if (page.q)
      filter.title = {
        $regex: literalSearch(page.q),
        $options: "i",
      };
    if (page.overdue === "true") {
      filter.dueAt = { $lt: new Date() };
      filter.status = { $nin: ["COMPLETED", "CANCELLED"] };
    }
    const [items, total] = await Promise.all([
      EmployeeTaskModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page.page - 1) * page.limit)
        .limit(page.limit)
        .lean(),
      EmployeeTaskModel.countDocuments(filter),
    ]);
    return {
      items: items.map((t) =>
        ctx.actor.kind === "employee"
          ? { ...t, internalInstructions: undefined }
          : t,
      ),
      total,
      page: page.page,
      pages: Math.ceil(total / page.limit),
    };
  },
  async detail(ctx: OperationsContext, id: string): Promise<unknown> {
    const task = await requiredTask(ctx, id);
    const result = task.toObject();
    if (ctx.actor.kind === "employee") result.internalInstructions = "";
    return result;
  },
  async create(
    ctx: OperationsContext,
    input: z.infer<typeof taskCreateSchema>,
  ): Promise<unknown> {
    permit(ctx, "tasks.create");
    permit(ctx, "tasks.assign");
    return withMongoTransaction(async (session) => {
      await validateReferences(input, session);
      await authorizeAttachments(ctx, input.attachments, session);
      const [task] = await EmployeeTaskModel.create(
        [
          {
            ...input,
            creator: ctx.actor.id,
            history: [
              {
                actor: ctx.actor.id,
                action: "created",
                from: "",
                to: "ASSIGNED",
                reason: "Task assigned",
              },
            ],
          },
        ],
        { session },
      );
      await audit(
        ctx,
        "task.assigned",
        task.id,
        "Task created and assigned",
        session,
      );
      await notify(
        input.assignees,
        "task.assigned",
        task.id,
        0,
        input.title,
        session,
      );
      return task;
    });
  },
  async update(
    ctx: OperationsContext,
    id: string,
    input: z.infer<typeof taskUpdateSchema>,
  ): Promise<unknown> {
    permit(ctx, "tasks.update");
    return withMongoTransaction(async (session) => {
      const task = await requiredTask(ctx, id, session);
      if (task.version !== input.version)
        throw new ApiError(409, "Task changed; reload");
      if (
        ["COMPLETED", "CANCELLED", "SUBMITTED", "APPROVED"].includes(
          task.status,
        )
      )
        throw new ApiError(409, "Task cannot be edited in this status");
      const { version, comment, ...changes } = input;
      const metadata = Object.keys(changes).filter(
        (k) => k !== "checklist" && k !== "attachments",
      );
      if (metadata.length) {
        permit(ctx, "tasks.create");
        if (ctx.actor.kind === "employee")
          throw new ApiError(403, "Task metadata requires administrator");
      }
      if (changes.assignees) permit(ctx, "tasks.assign");
      if (changes.dependencies) {
        const visited = new Set<string>();
        let frontier = [...changes.dependencies];
        for (let depth = 0; frontier.length; depth++) {
          if (depth > 100 || visited.size > 1000)
            throw new ApiError(400, "Dependency graph is too large");
          if (frontier.includes(id))
            throw new ApiError(409, "Task dependencies cannot contain a cycle");
          const next = frontier.filter((x) => !visited.has(x));
          next.forEach((x) => visited.add(x));
          const docs = await EmployeeTaskModel.find({ _id: { $in: next } })
            .select("dependencies")
            .session(session ?? null);
          frontier = docs
            .flatMap((d) => d.dependencies)
            .filter((x) => !visited.has(x));
        }
      }
      await validateReferences(changes, session);
      if (changes.attachments)
        await authorizeAttachments(ctx, changes.attachments, session);
      if (
        ctx.actor.kind === "employee" &&
        changes.checklist &&
        (changes.checklist.length !== task.checklist.length ||
          changes.checklist.some(
            (c) =>
              !task.checklist.some(
                (old) => old.id === c.id && old.label === c.label,
              ),
          ))
      )
        throw new ApiError(
          403,
          "Employees may only check existing checklist items",
        );
      const updated = await EmployeeTaskModel.findOneAndUpdate(
        { _id: id, version },
        {
          $set: changes,
          $inc: { version: 1 },
          ...(comment
            ? {
                $push: {
                  comments: {
                    actor: ctx.actor.id,
                    text: comment,
                    createdAt: new Date(),
                  },
                },
              }
            : {}),
        },
        { new: true, session },
      );
      if (!updated) throw new ApiError(409, "Task changed; reload");
      await audit(
        ctx,
        "task.updated",
        id,
        comment ? "Comment added" : "Task updated",
        session,
      );
      await notify(
        updated.assignees,
        changes.assignees ? "task.reassigned" : "task.updated",
        id,
        updated.version,
        updated.title,
        session,
      );
      return updated;
    });
  },
  async transition(
    ctx: OperationsContext,
    id: string,
    input: { version: number; status: TaskStatus; reason: string },
  ): Promise<unknown> {
    permit(ctx, "tasks.update");
    return withMongoTransaction(async (session) => {
      const task = await requiredTask(ctx, id, session);
      if (task.version !== input.version)
        throw new ApiError(409, "Task changed; reload");
      if (!taskTransitions[task.status as TaskStatus].includes(input.status))
        throw new ApiError(409, "Invalid task transition");
      if (["APPROVED", "REWORK_REQUIRED"].includes(input.status))
        throw new ApiError(409, "Review the pending approval instead");
      if (input.status === "CANCELLED") {
        permit(ctx, "tasks.assign");
        if (ctx.actor.kind !== "admin")
          throw new ApiError(403, "Administrator required");
      }
      if (
        input.status === "IN_PROGRESS" &&
        (await EmployeeTaskModel.exists({
          _id: { $in: task.dependencies },
          status: { $ne: "COMPLETED" },
        }).session(session ?? null))
      )
        throw new ApiError(409, "Complete task dependencies first");
      if (
        input.status === "SUBMITTED" &&
        task.checklist.some((c) => !c.checked)
      )
        throw new ApiError(409, "Complete the checklist before submitting");
      const destination =
        input.status === "SUBMITTED" && !task.requiresApproval
          ? "COMPLETED"
          : input.status;
      const updated = await EmployeeTaskModel.findOneAndUpdate(
        { _id: id, version: input.version },
        {
          $set: { status: destination },
          $inc: { version: 1 },
          $push: {
            history: {
              actor: ctx.actor.id,
              action: "transition",
              from: task.status,
              to: destination,
              at: new Date(),
              reason: input.reason,
            },
          },
        },
        { new: true, session },
      );
      if (!updated) throw new ApiError(409, "Task changed; reload");
      if (destination === "SUBMITTED")
        await ApprovalRequestModel.create(
          [
            {
              kind: "task",
              entity: id,
              requester: ctx.actor.id,
              expectedEntityVersion: updated.version,
              proposed: {
                status: "APPROVED",
                title: task.title,
                checklist: task.checklist.map((c) => ({
                  label: c.label,
                  checked: c.checked,
                })),
                attachments: task.attachments,
              },
              reason: input.reason || "Task submitted for review",
            },
          ],
          { session },
        );
      await audit(
        ctx,
        `task.${destination.toLowerCase()}`,
        id,
        `${task.status} → ${destination}`,
        session,
      );
      await notify(
        [...task.assignees, task.creator],
        `task.${destination.toLowerCase()}`,
        id,
        updated.version,
        task.title,
        session,
      );
      return updated;
    });
  },
  async deadlineNotifications(ctx: OperationsContext): Promise<void> {
    permit(ctx, "tasks.view");
    const tasks = await EmployeeTaskModel.find({
      ...scope(ctx),
      dueAt: { $gt: new Date(), $lt: new Date(Date.now() + 86400000) },
      status: { $in: ["ASSIGNED", "IN_PROGRESS", "REWORK_REQUIRED"] },
    }).limit(100);
    for (const task of tasks)
      await notify(
        task.assignees,
        "task.deadline",
        task.id,
        task.dueAt?.getTime() ?? 0,
        task.title,
      );
  },
};
