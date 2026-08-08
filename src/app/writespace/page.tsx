import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/services/categories";
import { WritespaceClient } from "@/components/writespace/writespace-client";

export const dynamic = "force-dynamic";

export default async function WritespacePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const cats = await listCategories();
  const categoryOptions = cats.map((c) => ({ id: c.id, name: c.name }));

  return <WritespaceClient categoryOptions={categoryOptions} />;
}
