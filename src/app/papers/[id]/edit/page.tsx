import { notFound, redirect } from "next/navigation";
import { getPaperDetail } from "@/lib/services/papers";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/categories";
import { SubmitForm } from "@/components/submit-form";

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

  const cats = await listCategories();
  const options = cats.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-bold">提交新版本</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        正在为 <span className="font-mono">{id}</span> 提交新版本。历史版本将被永久保留。
      </p>
      <SubmitForm categories={options} basePaperId={id} baseTitle={detail.latest.title} />
    </div>
  );
}
