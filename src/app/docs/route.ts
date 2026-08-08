import { serveDocs } from "@/lib/docs-static";

export const dynamic = "force-dynamic";

export async function GET() {
  return serveDocs("");
}
