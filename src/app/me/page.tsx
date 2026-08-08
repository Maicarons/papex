import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { papers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { listSubscriptions } from "@/lib/services/subscriptions";
import { listAnnouncements, markAnnouncementsRead } from "@/lib/services/feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const myPapers = await db
    .select()
    .from(papers)
    .where(eq(papers.createdById, user.id))
    .orderBy(papers.createdAt);

  const subs = await listSubscriptions(user.id);
  const announcements = await listAnnouncements(user.id);
  await markAnnouncementsRead(user.id);

  const typeLabel: Record<string, string> = {
    category: "分类",
    author: "作者",
    paper: "论文",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">我的中心</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">提醒（{announcements.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无提醒。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {announcements.map((a) => (
                <li key={a.id} className="rounded-md border p-2">
                  <span className="font-medium">{a.title}</span>
                  {a.body && <p className="text-muted-foreground">{a.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">我的投稿（{myPapers.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {myPapers.length === 0 ? (
            <p className="text-sm text-muted-foreground">还没有投稿。</p>
          ) : (
            <ul className="space-y-2">
              {myPapers.map((p) => (
                <li key={p.id}>
                  <Link href={`/papers/${p.id}`} className="hover:underline">
                    <span className="font-mono text-xs text-muted-foreground">{p.id}</span> {p.title}
                  </Link>
                  <Badge variant="outline" className="ml-2">
                    {p.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Button asChild className="mt-4" size="sm">
            <Link href="/submit">提交新论文</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">我的订阅（{subs.length}）</CardTitle>
        </CardHeader>
        <CardContent>
          {subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无订阅。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {subs.map((s) => (
                <li key={s.id}>
                  <Badge variant="secondary">{typeLabel[s.type]}</Badge> {s.refId}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
