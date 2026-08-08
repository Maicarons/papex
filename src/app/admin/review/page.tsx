import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listReviewQueue } from "@/lib/services/papers";
import { ReviewQueue } from "@/components/review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  const { rows } = await listReviewQueue();
  const items = rows.map((r) => ({
    paperId: r.paper.id,
    title: r.version.title,
    categoryId: r.paper.primaryCategoryId,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">投稿审核队列</h1>
      <ReviewQueue initial={items} />
    </div>
  );
}
