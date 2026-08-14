import { listRoles } from "@/lib/services/rbac";
import { PERMISSIONS, PERMISSION_GROUPS } from "@/lib/permission-catalog";
import { RolePermissionEditor } from "@/components/role-permission-editor";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const roles = await listRoles();
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.rolesTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.rolesSubtitle")}</p>
      </div>
      <RolePermissionEditor
        roles={roles.map((r) => ({ id: r.id, key: r.key, name: r.name, isSystem: r.isSystem, permissionKeys: r.permissionKeys }))}
        permissions={PERMISSIONS}
        groups={PERMISSION_GROUPS}
      />
    </div>
  );
}
