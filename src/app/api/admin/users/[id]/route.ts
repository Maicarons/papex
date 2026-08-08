import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { setUserRoles, setUserPermissionOverride } from "@/lib/services/rbac";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  roleKeys: z.array(z.string()).optional(),
  permission: z
    .object({ key: z.string(), grant: z.boolean().nullable() })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    if (parsed.data.roleKeys !== undefined) {
      if (!(await userCan(user, "user:manage"))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      await setUserRoles(id, parsed.data.roleKeys);
    }
    if (parsed.data.permission !== undefined) {
      if (!(await userCan(user, "permission:manage"))) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      await setUserPermissionOverride(id, parsed.data.permission.key, parsed.data.permission.grant);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "failed";
    const status = msg === "INVALID_PERMISSION" ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
