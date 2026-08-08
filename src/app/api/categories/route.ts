import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/services/categories";

export const dynamic = "force-dynamic";

export async function GET() {
  const tree = await getCategoryTree();
  return NextResponse.json({ categories: tree });
}
