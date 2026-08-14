import { notFound, redirect } from "next/navigation";
import { getPaperDetail } from "@/lib/services/papers";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/categories";
import { SubmitForm } from "@/components/submit-form";
import { detectCapabilities } from "@/lib/capabilities";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate, format } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function EditPaperPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPaperDetail(id);
  if (!detail) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.id !== detail.paper.createdById && user.role === "author") {
    redirect(`/papers/${id}`);
  }

  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const caps = detectCapabilities();

  const cats = await listCategories();
  const options = cats.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">{t("paper.newVersion")}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {format(t("paper.newVersionDesc"), { id })}
      </p>
      <SubmitForm
        categories={options}
        basePaperId={id}
        baseTitle={detail.latest.title}
        pdfUploadEnabled={caps.pdfUpload}
      />
    </div>
  );
}
