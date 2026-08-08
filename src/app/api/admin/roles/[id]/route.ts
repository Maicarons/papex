import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { userCan } from "@/lib/auth/permissions";
import { setRolePermissions } from "@/lib/services/rbac";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  permissionKeys: z.array(z.string()),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await userCan(user, "role:manage"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const roleId = Number(id);
  if (!Number.isInteger(roleId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
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
  await setRolePermissions(roleId, parsed.data.permissionKeys);
  return NextResponse.json({ ok: true });
}
