import { NextResponse } from "next/server";
import { openapiSpec } from "@/lib/openapi/spec.generated";

export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(openapiSpec, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
