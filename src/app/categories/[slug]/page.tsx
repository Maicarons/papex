import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategory, getAllCategorySlugs, localizeCategoryName, localizeCategoryDescription } from "@/lib/services/categories";
import { listPapers } from "@/lib/services/papers";
import { PaperCard } from "@/components/paper-card";
import { SubscribeButton } from "@/components/subscribe-button";
import { LocaleText } from "@/components/locale-text";
import { getServerLocale } from "@/i18n/server";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const cats = await getAllCategorySlugs();
    return cats;
  } catch {
    // No DB at build time (e.g. CI without DATABASE_URL): skip prerender and
    // fall back to on-demand ISR via dynamicParams (default true).
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return {};
  const locale = await getServerLocale();
  const name = localizeCategoryName(cat.name, cat.nameZh, locale);
  const description = localizeCategoryDescription(cat.description, cat.descriptionZh, locale);
  return {
    title: `${cat.id} · ${name}`,
    description: description ?? undefined,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const locale = await getServerLocale();
  const name = localizeCategoryName(cat.name, cat.nameZh, locale);
  const description = localizeCategoryDescription(cat.description, cat.descriptionZh, locale);

  const { rows, total } = await listPapers({ category: slug, pageSize: 20 });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-sm text-muted-foreground">{cat.id}</div>
          <h1 className="text-2xl font-bold">{name}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            <LocaleText path="papers.results" vars={{ n: total }} />
          </p>
        </div>
        <SubscribeButton type="category" refId={cat.id} />
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          <LocaleText path="categories.emptyPapers" />
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => (
            <PaperCard key={item.paper.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
