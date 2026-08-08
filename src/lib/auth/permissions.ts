import { db } from "@/lib/db";
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissions,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  type PermissionDef,
} from "@/lib/permission-catalog";

export {
  PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  type PermissionDef,
} from "@/lib/permission-catalog";

// ---------------------------------------------------------------------------
// Effective permission computation
// ---------------------------------------------------------------------------

export interface PermissionUser {
  id: string;
}

/**
 * Compute the effective permission set for a user.
 *
 * Resolution order:
 *   1. The user's base role (users.role) — mirrors legacy behaviour.
 *   2. Any roles assigned via user_roles (many-to-many).
 *   3. Per-user overrides (user_permissions): grant=true adds, grant=false removes.
 *
 * This supports both role-level and user-granular control as required.
 */
export async function getEffectivePermissions(userId: string): Promise<Set<string>> {
  const [user] = await db.select({ role: users.role }).from(users).where(eq(users.id, userId));
  if (!user) return new Set();

  const roleKeys = new Set<string>([user.role]);
  const assigned = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  for (const r of assigned) roleKeys.add(r.key);

  const effective = new Set<string>();
  let roleResolved = false;
  if (roleKeys.size > 0) {
    const roleRows = await db
      .select({ id: roles.id })
      .from(roles)
      .where(inArray(roles.key, [...roleKeys]));
    const roleIds = roleRows.map((r) => r.id);
    if (roleIds.length > 0) {
      roleResolved = true;
      const permRows = await db
        .select({ key: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds));
      for (const r of permRows) effective.add(r.key);
    }
  }

  // Safety net: if the roles table has no rows for this user's roles yet
  // (e.g. the RBAC seed hasn't been run), fall back to the built-in defaults
  // so the application stays usable instead of locking everyone out.
  if (!roleResolved) {
    for (const k of DEFAULT_ROLE_PERMISSIONS[user.role] ?? []) effective.add(k);
  }

  // Per-user overrides win over role grants.
  const overrides = await db
    .select({ key: userPermissions.permissionKey, grant: userPermissions.grant })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
  for (const o of overrides) {
    if (o.grant) effective.add(o.key);
    else effective.delete(o.key);
  }

  return effective;
}

/** Returns true when the user holds the given permission. */
export async function userCan(user: PermissionUser, perm: string): Promise<boolean> {
  if (!PERMISSION_KEYS.has(perm)) return false;
  const perms = await getEffectivePermissions(user.id);
  return perms.has(perm);
}

/** Throws an Error("FORBIDDEN") when the user lacks the permission. */
export async function requirePermission(user: PermissionUser, perm: string): Promise<void> {
  if (!(await userCan(user, perm))) {
    throw new Error("FORBIDDEN");
  }
}
