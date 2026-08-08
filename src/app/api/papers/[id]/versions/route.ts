import { NextResponse } from "next/server";
import { listVersions } from "@/lib/services/papers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versions = await listVersions(id);
  return NextResponse.json({ versions });
}
