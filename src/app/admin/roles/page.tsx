import { listRoles } from "@/lib/services/rbac";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permission-catalog";
import { RolePermissionEditor } from "@/components/role-permission-editor";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const roles = await listRoles();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">角色权限配置</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          选择角色后勾选其拥有的权限，保存后即时生效。系统角色（管理员 / 审核员 / 作者 / 读者）
          的默认权限可在此调整。
        </p>
      </div>
      <RolePermissionEditor
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, isSystem: r.isSystem, permissionKeys: r.permissionKeys }))}
        permissions={PERMISSIONS}
        groups={PERMISSION_GROUPS}
      />
    </div>
  );
}
