import { NextResponse } from "next/server";
import { getPaperDetail } from "@/lib/services/papers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) return NextResponse.json({ error: "论文不存在" }, { status: 404 });
  return NextResponse.json(detail);
}
