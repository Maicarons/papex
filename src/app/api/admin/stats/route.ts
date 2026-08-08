import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getAdminStats } from "@/lib/services/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    return NextResponse.json({ error: "需要审核员权限" }, { status: 403 });
  }
  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
