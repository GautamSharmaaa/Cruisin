// Governed by .rules v1.0
export const userRoles = ['customer', 'admin', 'superadmin', 'manager', 'viewer'] as const;
export type UserRole = (typeof userRoles)[number];
export type AdminRole = Exclude<UserRole, 'customer'>;

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
