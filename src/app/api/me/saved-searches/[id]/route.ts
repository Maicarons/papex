import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { deleteSavedSearch } from "@/lib/services/saved-searches";

export const dynamic = "force-dynamic";

/** DELETE /api/me/saved-searches/{id} — remove a saved search (owner only). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const ok = await deleteSavedSearch(user.id, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}