import { NextResponse } from "next/server";
import { presignPdfUrl, readPdfBuffer, storageDriver } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Stream a stored paper PDF back to the browser.
 *
 * - local backend: streams the file bytes directly.
 * - s3 backend: issues a 302 redirect to a presigned (or public) object URL so
 *   the PDF is served by the object store without passing through the server.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; version: string }> },
) {
  const { id, version } = await params;
  const v = Number(version);
  if (!Number.isInteger(v) || v <= 0) {
    return NextResponse.json({ error: "版本号无效" }, { status: 400 });
  }
  try {
    if (storageDriver() === "s3") {
      const url = await presignPdfUrl(id, v);
      if (url) return NextResponse.redirect(url, 302);
    }
    const buf = await readPdfBuffer(id, v);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${id}-v${v}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "PDF 不存在" }, { status: 404 });
  }
}
