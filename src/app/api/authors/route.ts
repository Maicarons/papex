import { NextResponse } from "next/server";
import { listAuthors } from "@/lib/services/authors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rows = await listAuthors(searchParams.get("q") ?? undefined);
  return NextResponse.json({ authors: rows });
}
