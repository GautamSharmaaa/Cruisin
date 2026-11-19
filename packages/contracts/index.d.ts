export type Permission =
  | "inventory.receive"
  | "units.generate"
  | "units.scan"
  | "qc.perform"
  | "shipping.prepare"
  | "audit.view"
  | "employees.manage"
  | "tasks.view"
  | "tasks.create"
  | "tasks.assign"
  | "tasks.update"
  | "tasks.approve"
  | "orders.view"
  | "orders.pack"
  | "orders.update"
  | "inventory.view"
  | "inventory.count"
  | "inventory.adjust.request"
  | "inventory.adjust.approve"
  | "sop.view"
  | "sop.create"
  | "sop.publish"
  | "media.manage";
export type EmployeeRole =
  | "operations_manager"
  | "inventory_manager"
  | "warehouse_employee"
  | "qc_employee"
  | "packaging_employee"
  | "readonly_employee";
export type TaskStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "APPROVED"
  | "COMPLETED"
  | "REWORK_REQUIRED"
  | "CANCELLED";
export const permissions: readonly Permission[];
export const employeeRoles: readonly EmployeeRole[];
export const taskStatuses: readonly TaskStatus[];
export const rolePermissions: Readonly<
  Record<EmployeeRole, readonly Permission[]>
>;
export interface Principal {
  id: string;
  kind: "admin" | "employee";
  name: string;
  permissions: Permission[];
}
export interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  permissions: Permission[];
  grants: Permission[];
  denials: Permission[];
  active: boolean;
  version: number;
  timezone: string;
}
export interface Task {
  _id: string;
  title: string;
  description: string;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  assignees: string[];
  status: TaskStatus;
  version: number;
  dueAt?: string;
  checklist: { id: string; label: string; checked: boolean }[];
  comments: { actor: string; text: string; createdAt: string }[];
  attachments: string[];
  unit?: string;
  sop?: string;
  order?: string;
  sku?: string;
  internalInstructions?: string;
  history: {
    actor: string;
    action: string;
    from: string;
    to: string;
    at: string;
    reason: string;
  }[];
}
export interface Approval {
  evidence: string[];
  existing?: Record<string, unknown>;
  _id: string;
  kind:
    | "task"
    | "inventory"
    | "inspection"
    | "order_exception"
    | "sop_change"
    | "sop_publication"
    | "qc_override"
    | "unit_disposition";
  entity: string;
  requester: string;
  status: string;
  reason: string;
  notes: string;
  version: number;
  proposed: Record<string, unknown>;
}
export interface InventoryRow {
  product: string;
  variant: string;
  title: string;
  image?: string;
  sku: string;
  size: string;
  color: string;
  available: number;
  reserved: number;
  damaged: number;
  threshold: number;
  revision: number;
}
export interface Sop {
  sections?: { title: string; body: string }[];
  measurements?: {
    key: string;
    label: string;
    unit: string;
    min: number;
    max: number;
    required: boolean;
  }[];
  publishedVersion?: number;
  flowLabels?: { start: string; end: string };
  kind?: "GENERAL" | "PRODUCT" | "PACKAGING";
  requirements?: {
    key: string;
    label: string;
    mandatory: boolean;
    photo: boolean;
    scan: boolean;
  }[];
  _id: string;
  title: string;
  category: string;
  version: number;
  status: string;
  body: string;
  steps: string[];
  attachments: string[];
  roles: EmployeeRole[];
  products: string[];
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}
