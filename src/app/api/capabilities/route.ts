import { NextResponse } from "next/server";
import { detectCapabilities } from "@/lib/capabilities";

export const dynamic = "force-dynamic";

/**
 * GET /api/capabilities
 *
 * Public endpoint reporting which optional features are enabled on this
 * deployment (see src/lib/capabilities.ts). The UI uses it to disable
 * entry points like PDF upload, online authoring and source-package
 * submission when the backing service is unavailable.
 */
export async function GET() {
  return NextResponse.json(detectCapabilities(), {
    headers: { "Cache-Control": "no-store" },
  });
}
