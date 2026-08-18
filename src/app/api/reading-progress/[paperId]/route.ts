import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { readingProgress } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const versionField = z
  .union([z.number().int(), z.string()])
  .transform((v) => Number(v) || 1)
  .default(1);

const putSchema = z.object({
  page: z.number().int().min(0).default(0),
  percent: z.number().int().min(0).max(100).default(0),
  version: versionField,
});

function toView(row: typeof readingProgress.$inferSelect) {
  return {
    paperId: row.paperId,
    version: row.version,
    page: row.page,
    percent: row.percent,
    updatedAt: row.updatedAt,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { paperId } = await params;
  const [row] = await db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.userId, user.id),
        eq(readingProgress.paperId, paperId),
        eq(readingProgress.version, 1),
      ),
    )
    .limit(1);
  if (!row) return NextResponse.json({ progress: null });
  return NextResponse.json({ progress: toView(row) });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ paperId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { paperId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  const version = parsed.data.version;
  await db
    .insert(readingProgress)
    .values({
      userId: user.id,
      paperId,
      version,
      page: parsed.data.page,
      percent: parsed.data.percent,
    })
    .onConflictDoUpdate({
      target: [
        readingProgress.userId,
        readingProgress.paperId,
        readingProgress.version,
      ],
      set: {
        page: parsed.data.page,
        percent: parsed.data.percent,
        updatedAt: new Date(),
      },
    });
  return NextResponse.json({
    progress: { paperId, version, page: parsed.data.page, percent: parsed.data.percent },
  });
}
