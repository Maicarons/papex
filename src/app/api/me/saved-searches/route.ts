import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import {
  listSavedSearches,
  createSavedSearch,
  type SavedSearchRow,
} from "@/lib/services/saved-searches";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().max(120).optional(),
  q: z.string().min(2).max(200),
  category: z.string().min(1).max(60).optional(),
  semantic: z.boolean().optional(),
});

function toView(row: SavedSearchRow) {
  return {
    id: row.id,
    name: row.name,
    q: row.q,
    category: row.category,
    semantic: row.semantic,
    createdAt: row.createdAt,
  };
}

/** GET /api/me/saved-searches — list the current user's saved searches. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await listSavedSearches(user.id);
  return NextResponse.json({ searches: rows.map(toView) });
}

/** POST /api/me/saved-searches — create (upsert) a saved search. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const row = await createSavedSearch(user.id, parsed.data);
  return NextResponse.json({ search: toView(row) }, { status: 201 });
}