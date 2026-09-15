import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/services/categories";

// Public taxonomy is effectively static; allow CDN caching with a short TTL so
// edits propagate quickly while list renders skip a DB round-trip.
export const dynamic = "force-dynamic";

export async function GET() {
  const tree = await getCategoryTree();
  return NextResponse.json(
    { categories: tree },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
