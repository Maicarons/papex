import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getUserProfile } from "@/lib/services/users";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Globe, Link2 } from "lucide-react";
import { initials } from "@/lib/utils";

export const revalidate = 3600;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getUserProfile(username);
  if (!profile) return {};
  return {
    title: profile.user.displayName,
    description: `@${profile.user.username} 的主页`,
  };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getUserProfile(username);
  if (!profile) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials(profile.user.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{profile.user.displayName}</h1>
            <p className="text-sm text-muted-foreground">@{profile.user.username}</p>
            {profile.user.bio && (
              <p className="mt-2 text-sm leading-relaxed">{profile.user.bio}</p>
            )}
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {profile.user.institution && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0" />
                  <span>{profile.user.institution}</span>
                </div>
              )}
              {profile.user.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{profile.user.location}</span>
                </div>
              )}
              {profile.user.website && (
                <a
                  href={profile.user.website}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  <span className="truncate">{profile.user.website}</span>
                </a>
              )}
              {profile.user.orcid && (
                <a
                  href={`https://orcid.org/${profile.user.orcid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-foreground"
                >
                  <Link2 className="h-4 w-4 shrink-0" />
                  <span>ORCID: {profile.user.orcid}</span>
                </a>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{profile.papers.length} 篇投稿</Badge>
              <Badge variant="outline">{profile.subscriptionCount} 个订阅</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">投稿</h2>
        {profile.papers.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无投稿。</p>
        ) : (
          <ul className="space-y-2">
            {profile.papers.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/papers/${p.id}`}
                  className="rounded-md border p-3 hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="font-mono text-xs text-muted-foreground">{p.id}</span> {p.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
