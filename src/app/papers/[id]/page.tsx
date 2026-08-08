import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPaperDetail } from "@/lib/services/papers";
import { listCitations } from "@/lib/services/citations";
import { PaperView } from "@/components/paper-view";

export const revalidate = 3600;

// No params known at build time; render on-demand and cache (ISR) per paper id
// via the default dynamicParams = true.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) return {};
  const title = detail.latest.title;
  const description = detail.latest.abstract ? detail.latest.abstract.slice(0, 160) : undefined;
  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
  };
}

export default async function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) notFound();
  const graph = await listCitations(id);

  return (
    <PaperView
      detail={detail}
      version={detail.latest}
      citations={graph}
    />
  );
}
