import { db } from "@/lib/db";
import { paperTags, tags } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export interface TagWithCount {
  id: number;
  name: string;
  createdAt: Date | null;
  count: number;
}

/** All tags with how many papers carry them, ordered by usage. */
export async function listTags(limit = 50): Promise<TagWithCount[]> {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      createdAt: tags.createdAt,
      count: sql<number>`count(${paperTags.paperId})::int`,
    })
    .from(tags)
    .leftJoin(paperTags, eq(paperTags.tagId, tags.id))
    .groupBy(tags.id, tags.name, tags.createdAt)
    .orderBy(sql`count(${paperTags.paperId}) desc`, tags.name)
    .limit(limit);
  return rows;
}

/** Find a tag by name (case-insensitive) or null. */
export async function findTagByName(name: string) {
  const [row] = await db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${name.trim().toLowerCase()}`)
    .limit(1);
  return row ?? null;
}

/** Create a tag (returns existing tag if the name is already taken). */
export async function createTag(name: string, createdById: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("TAG_NAME_EMPTY");
  const existing = await findTagByName(trimmed);
  if (existing) return existing;
  const [row] = await db.insert(tags).values({ name: trimmed, createdById }).returning();
  return row;
}

/** Tags attached to a paper. */
export async function listPaperTags(paperId: string): Promise<{ id: number; name: string }[]> {
  const rows = await db
    .select({ id: tags.id, name: tags.name })
    .from(paperTags)
    .innerJoin(tags, eq(paperTags.tagId, tags.id))
    .where(eq(paperTags.paperId, paperId))
    .orderBy(tags.name);
  return rows;
}

/** Attach a tag to a paper (idempotent). Returns the tag. */
export async function attachTag(paperId: string, tagId: number) {
  await db
    .insert(paperTags)
    .values({ paperId, tagId })
    .onConflictDoNothing();
  const [tag] = await db.select().from(tags).where(eq(tags.id, tagId)).limit(1);
  return tag;
}

/** Detach a tag from a paper (idempotent). */
export async function detachTag(paperId: string, tagId: number) {
  await db.delete(paperTags).where(and(eq(paperTags.paperId, paperId), eq(paperTags.tagId, tagId)));
}

/** Resolve a tag name to an id, creating it on the fly (keywords etc.). */
export async function ensureTag(name: string, createdById: string) {
  const tag = await createTag(name, createdById);
  return tag.id;
}

/** Attach several tag names to a paper, creating missing tags. */
export async function attachTagsByName(
  paperId: string,
  names: string[],
  createdById: string,
): Promise<number> {
  let attached = 0;
  for (const raw of names) {
    const name = raw.trim();
    if (!name || name.length > 40) continue;
    const id = await ensureTag(name, createdById);
    await attachTag(paperId, id);
    attached += 1;
  }
  return attached;
}

export interface TagCoOccurrenceNode {
  id: number;
  name: string;
  count: number;
}

export interface TagCoOccurrenceEdge {
  source: string; // tag id as string
  target: string;
  weight: number;
}

export interface TagCoOccurrence {
  nodes: TagCoOccurrenceNode[];
  links: TagCoOccurrenceEdge[];
}

/**
 * Keyword co-occurrence network: tags that frequently appear on the same
 * paper. Mirrors CNKI's keyword co-occurrence analysis.
 */
export async function listTagCoOccurrence(limit = 30): Promise<TagCoOccurrence> {
  const pairRows = (await db.execute(sql`
    select a.tag_id as tid1, b.tag_id as tid2, count(*)::int as n
    from paper_tags a
    join paper_tags b on a.paper_id = b.paper_id and a.tag_id < b.tag_id
    group by a.tag_id, b.tag_id
    order by n desc
    limit ${limit}
  `)) as { tid1: number; tid2: number; n: number }[];

  if (pairRows.length === 0) return { nodes: [], links: [] };

  const ids = [...new Set(pairRows.flatMap((p) => [p.tid1, p.tid2]))];
  const tagRows = await db
    .select({ id: tags.id, name: tags.name })
    .from(tags)
    .where(sql`${tags.id} in ${ids}`);
  const byId = new Map(tagRows.map((t) => [t.id, t.name]));

  const used = new Set<number>();
  const links = pairRows.map((p) => {
    used.add(p.tid1);
    used.add(p.tid2);
    return { source: String(p.tid1), target: String(p.tid2), weight: p.n };
  });

  const nodes = [...used].map((id) => ({
    id,
    name: byId.get(id) ?? `#${id}`,
    count: 1,
  }));

  return { nodes, links };
}
