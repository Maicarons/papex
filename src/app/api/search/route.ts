import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { listPapers } from "@/lib/services/papers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = await getCurrentUser();
  const requested = searchParams.get("status") ?? "approved";
  const status =
    requested !== "approved" && user && (user.role === "moderator" || user.role === "admin")
      ? requested
      : "approved";
  const authorIdRaw = searchParams.get("authorId");
  const rows = await listPapers({
    status,
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    authorId: authorIdRaw ? Number(authorIdRaw) : undefined,
    sort: (searchParams.get("sort") as "new" | "updated") ?? "new",
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Math.min(Number(searchParams.get("pageSize") ?? 20), 50),
  });
  return NextResponse.json(rows);
}
