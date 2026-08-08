import { db } from "@/lib/db";
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissions,
} from "@/lib/db/schema";
import { eq, inArray, desc, and, like, sql, count } from "drizzle-orm";
import {
  PERMISSIONS,
  PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  SYSTEM_ROLE_KEYS,
} from "@/lib/auth/permissions";

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export interface RoleWithPermissions {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionKeys: string[];
}

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const roleRows = await db.select().from(roles).orderBy(roles.id);
  const links = await db
    .select({ roleId: rolePermissions.roleId, key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));
  const byRole = new Map<number, string[]>();
  for (const l of links) {
    const arr = byRole.get(l.roleId) ?? [];
    arr.push(l.key);
    byRole.set(l.roleId, arr);
  }
  return roleRows.map((r) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissionKeys: byRole.get(r.id) ?? [],
  }));
}

export async function getRoleByKey(key: string) {
  const [row] = await db.select().from(roles).where(eq(roles.key, key));
  return row ?? null;
}

export async function setRolePermissions(
  roleId: number,
  permissionKeys: string[],
): Promise<void> {
  const valid = permissionKeys.filter((k) => PERMISSION_KEYS.has(k));
  const permRows = await db
    .select({ id: permissions.id })
    .from(permissions)
    .where(inArray(permissions.key, valid));
  const permIds = permIdsList(permRows);
  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (permIds.length > 0) {
      await tx
        .insert(rolePermissions)
        .values(permIds.map((pid) => ({ roleId, permissionId: pid })));
    }
  });
}

function permIdsList(rows: { id: number }[]): number[] {
  return rows.map((r) => r.id);
}

// ---------------------------------------------------------------------------
// Users + role assignments
// ---------------------------------------------------------------------------

export interface UserPermissionOverride {
  key: string;
  grant: boolean;
}

export interface UserWithRoles {
  id: string;
  username: string;
  displayName: string;
  email: string;
  role: string;
  bio: string | null;
  createdAt: string;
  roleKeys: string[];
  overrideCount: number;
  overrides: UserPermissionOverride[];
}

export async function listUsers(opts: { q?: string; page?: number; pageSize?: number } = {}) {
  const { q = "", page = 1, pageSize = 30 } = opts;
  const where = q
    ? sql`(${users.username} ILIKE ${`%${q}%`} OR ${users.displayName} ILIKE ${`%${q}%`} OR ${users.email} ILIKE ${`%${q}%`})`
    : undefined;

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(users)
    .where(where);

  const userRows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const ids = userRows.map((u) => u.id);
  const roleLinks =
    ids.length > 0
      ? await db
          .select({ userId: userRoles.userId, key: roles.key })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(userRoles.userId, ids))
      : [];
  const overrideRows =
    ids.length > 0
      ? await db
          .select({
            userId: userPermissions.userId,
            key: userPermissions.permissionKey,
            grant: userPermissions.grant,
          })
          .from(userPermissions)
          .where(inArray(userPermissions.userId, ids))
      : [];

  const roleMap = new Map<string, string[]>();
  for (const l of roleLinks) {
    const arr = roleMap.get(l.userId) ?? [];
    arr.push(l.key);
    roleMap.set(l.userId, arr);
  }
  const overrideMap = new Map<string, UserPermissionOverride[]>();
  for (const o of overrideRows) {
    const arr = overrideMap.get(o.userId) ?? [];
    arr.push({ key: o.key, grant: o.grant });
    overrideMap.set(o.userId, arr);
  }

  const rows: UserWithRoles[] = userRows.map((u) => ({
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    bio: u.bio,
    createdAt: u.createdAt.toISOString(),
    roleKeys: roleMap.get(u.id) ?? [],
    overrideCount: overrideMap.get(u.id)?.length ?? 0,
    overrides: overrideMap.get(u.id) ?? [],
  }));

  return { rows, total, page, pageSize };
}

export async function setUserRoles(userId: string, roleKeys: string[]): Promise<void> {
  const validKeys = roleKeys.filter((k) => SYSTEM_ROLE_KEYS.includes(k));
  const roleRows = await db
    .select({ id: roles.id })
    .from(roles)
    .where(inArray(roles.key, validKeys));
  const roleIds = roleRows.map((r) => r.id);
  await db.transaction(async (tx) => {
    await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    if (roleIds.length > 0) {
      await tx.insert(userRoles).values(roleIds.map((rid) => ({ userId, roleId: rid })));
    }
  });
}

export async function getUserPermissionDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return null;
  const roleLinks = await db
    .select({ key: roles.key })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  const overrides = await db
    .select({ key: userPermissions.permissionKey, grant: userPermissions.grant })
    .from(userPermissions)
    .where(eq(userPermissions.userId, userId));
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    baseRole: user.role,
    roleKeys: roleLinks.map((r) => r.key),
    overrides: overrides.map((o) => ({ key: o.key, grant: o.grant })),
  };
}

/** grant: true=allow, false=deny, null=clear override. */
export async function setUserPermissionOverride(
  userId: string,
  permissionKey: string,
  grant: boolean | null,
): Promise<void> {
  if (!PERMISSION_KEYS.has(permissionKey)) throw new Error("INVALID_PERMISSION");
  await db.transaction(async (tx) => {
    await tx
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionKey, permissionKey),
        ),
      );
    if (grant !== null) {
      await tx
        .insert(userPermissions)
        .values({ userId, permissionKey, grant });
    }
  });
}

export { DEFAULT_ROLE_PERMISSIONS };
