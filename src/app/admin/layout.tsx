import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "moderator" && user.role !== "admin")) {
    redirect("/");
  }
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-muted-foreground">管理后台</h1>
        </div>
        <AdminNav />
        <div className="border-border/60 border-b" />
      </div>
      {children}
    </div>
  );
}
