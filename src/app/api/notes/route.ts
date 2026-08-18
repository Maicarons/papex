import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";

export const dynamic = "force-dynamic";

const versionField = z
  .union([z.number().int(), z.string()])
  .transform((v) => Number(v) || 1)
  .default(1);

const noteInputSchema = z.object({
  paperId: z.string().min(1),
  version: versionField,
  kind: z.enum(["highlight", "note"]).default("highlight"),
  page: z.number().int().min(0).default(0),
  rect: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
  color: z.string().max(32).optional(),
  content: z.string().max(20000).optional(),
});

/** Accept a rect that may arrive as a JSON string (mobile) or an object (desktop). */
function parseRect(rect: unknown): Record<string, unknown> | null {
  if (rect == null) return null;
  if (typeof rect === "string") {
    try {
      return JSON.parse(rect);
    } catch {
      return null;
    }
  }
  if (typeof rect === "object") return rect as Record<string, unknown>;
  return null;
}

function serializeRect(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Record<string, unknown>;
}

function serializeNote(row: typeof notes.$inferSelect) {
  return {
    id: row.id,
    paperId: row.paperId,
    version: row.version,
    kind: row.kind,
    page: row.page,
    rect: serializeRect(row.rect),
    color: row.color,
    content: row.content,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  const version = url.searchParams.get("version");

  const conds = [eq(notes.userId, user.id), isNull(notes.deletedAt)];
  if (paperId) conds.push(eq(notes.paperId, paperId));
  if (version) conds.push(eq(notes.version, Number(version) || 1));

  const rows = await db
    .select()
    .from(notes)
    .where(and(...conds))
    .orderBy(desc(notes.createdAt));
  return NextResponse.json({ notes: rows.map(serializeNote) });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = noteInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const [row] = await db
    .insert(notes)
    .values({
      userId: user.id,
      paperId: parsed.data.paperId,
      version: parsed.data.version,
      kind: parsed.data.kind,
      page: parsed.data.page,
      rect: parseRect(parsed.data.rect),
      color: parsed.data.color ?? null,
      content: parsed.data.content ?? null,
    })
    .returning();
  return NextResponse.json({ note: serializeNote(row) }, { status: 201 });
}

const updateSchema = z.object({
  id: z.string().min(1),
  content: z.string().max(20000).optional(),
  color: z.string().max(32).optional(),
  rect: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
});

export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const update: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.content !== undefined) update.content = parsed.data.content;
  if (parsed.data.color !== undefined) update.color = parsed.data.color;
  if (parsed.data.rect !== undefined) update.rect = parseRect(parsed.data.rect);
  const [row] = await db
    .update(notes)
    .set(update)
    .where(and(eq(notes.id, parsed.data.id), eq(notes.userId, user.id)))
    .returning();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ note: serializeNote(row) });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const json = await req.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.id, parsed.data.id), eq(notes.userId, user.id)));
  return NextResponse.json({ ok: true });
}
