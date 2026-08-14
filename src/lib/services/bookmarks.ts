import { db } from "@/lib/db";
import { bookmarks, papers } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";

export interface BookmarkItem {
  id: number;
  paperId: string;
  paperTitle: string;
  createdAt: string;
}

export async function listBookmarks(userId: string): Promise<BookmarkItem[]> {
  const rows = await db
    .select({
      id: bookmarks.id,
      paperId: bookmarks.paperId,
      paperTitle: papers.title,
      createdAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .innerJoin(papers, eq(bookmarks.paperId, papers.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt));
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function isBookmarked(userId: string, paperId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.paperId, paperId)))
    .limit(1);
  return !!row;
}

/** Toggles a bookmark. Returns true if now bookmarked, false if removed. */
export async function toggleBookmark(userId: string, paperId: string): Promise<boolean> {
  const existing = await isBookmarked(userId, paperId);
  if (existing) {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.paperId, paperId)));
    return false;
  }
  await db.insert(bookmarks).values({ userId, paperId });
  return true;
}

export async function removeBookmark(userId: string, paperId: string): Promise<void> {
  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.paperId, paperId)));
}
