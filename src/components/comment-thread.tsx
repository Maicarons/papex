"use client";

import * as React from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/i18n/i18n-provider";

interface CommentNode {
  id: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorUsername: string | null;
  parentId: number | null;
  children: CommentNode[];
}

export function CommentThread({ paperId }: { paperId: string }) {
  const { t } = useI18n();
  const [tree, setTree] = React.useState<CommentNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [body, setBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/papers/${paperId}/comments`);
    const data = await res.json();
    setTree(data.comments as CommentNode[]);
    setLoading(false);
  }, [paperId]);

  React.useEffect(() => {
    let active = true;
    fetch(`/api/papers/${paperId}/comments`)
      .then((res) => res.json())
      .then((data: { comments: CommentNode[] }) => {
        if (!active) return;
        setTree(data.comments);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [paperId]);

  async function post(parentId: number | undefined, text: string) {
    if (!text.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/papers/${paperId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, parentId }),
      });
      if (res.status === 401) {
        // Full reload (not router.push) so the client session state resets on re-auth.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
        return;
      }
      setBody("");
      await load();
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t("comments.loading")}</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2 pt-6">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("comments.loginPlaceholder")}
          />
          <Button onClick={() => post(undefined, body)} disabled={posting || !body.trim()}>
            {t("comments.post")}
          </Button>
        </CardContent>
      </Card>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("comments.empty")}</p>
      ) : (
        <div className="space-y-3">
          {tree.map((c) => (
            <CommentItem key={c.id} node={c} onReply={post} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  node,
  onReply,
}: {
  node: CommentNode;
  onReply: (parentId: number, text: string) => void;
}) {
  const { t } = useI18n();
  const [replying, setReplying] = React.useState(false);
  const [text, setText] = React.useState("");

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm">
        {node.authorUsername ? (
          <Link href={`/u/${node.authorUsername}`} className="font-medium hover:underline">
            {node.authorName}
          </Link>
        ) : (
          <span className="font-medium">{node.authorName}</span>
        )}
        <span className="text-xs text-muted-foreground">{formatDate(node.createdAt)}</span>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm">{node.body}</p>
      <button
        className="mt-1 text-xs text-muted-foreground hover:underline"
        onClick={() => setReplying((v) => !v)}
      >
        {t("comments.reply")}
      </button>
      {replying && (
        <div className="mt-2 space-y-2">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("comments.replyPlaceholder")} />
          <Button
            size="sm"
            onClick={() => {
              onReply(node.id, text);
              setText("");
              setReplying(false);
            }}
            disabled={!text.trim()}
          >
            {t("comments.sendReply")}
          </Button>
        </div>
      )}
      {node.children.length > 0 && (
        <div className="ml-4 mt-3 space-y-3 border-l pl-3">
          {node.children.map((child) => (
            <CommentItem key={child.id} node={child} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}
