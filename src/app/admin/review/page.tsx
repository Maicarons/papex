import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listReviewQueue } from "@/lib/services/papers";
import { ReviewQueue } from "@/components/review-queue";
import { getServerLocale } from "@/i18n/server";
import { getDictionary, t as translate } from "@/i18n";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  const t = (path: string) => translate(dict, path);
  const { rows } = await listReviewQueue();
  const items = rows.map((r) => ({
    paperId: r.paper.id,
    title: r.version.title,
    categoryId: r.paper.primaryCategoryId,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">{t("admin.reviewQueueTitle")}</h1>
      <ReviewQueue initial={items} />
    </div>
  );
}
