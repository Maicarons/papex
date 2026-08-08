import { serveDocs } from "@/lib/docs-static";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const { slug } = await params;
  return serveDocs((slug ?? []).join("/"));
}
