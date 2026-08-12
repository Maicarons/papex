import { db } from "@/lib/db";
import { endorsements, categories, users } from "@/lib/db/schema";
import { and, desc, eq, getTableColumns, type SQL } from "drizzle-orm";

export type EndorsementRow = typeof endorsements.$inferSelect;

export interface EndorsementView extends EndorsementRow {
  categoryName: string | null;
  endorserName: string | null;
}

/** Pure rule helpers — unit-tested without a database. */

export function isSelfEndorse(endorserId: string, endorseeId: string): boolean {
  return endorserId === endorseeId;
}

/**
 * A first submission in a category is gated: it is allowed only when the author
 * already has a paper in that category OR holds an endorsement for it.
 */
export function requiresEndorsement(hasPriorPaper: boolean, hasEndorsement: boolean): boolean {
  return !hasPriorPaper && !hasEndorsement;
}

export async function createEndorsement(input: {
  endorserId: string;
  endorseeId: string;
  categoryId: string;
}): Promise<EndorsementRow> {
  if (isSelfEndorse(input.endorserId, input.endorseeId)) {
    throw new Error("SELF_ENDORSE");
  }
  const [existing] = await db
    .select({ id: endorsements.id })
    .from(endorsements)
    .where(
      and(
        eq(endorsements.endorserId, input.endorserId),
        eq(endorsements.endorseeId, input.endorseeId),
        eq(endorsements.categoryId, input.categoryId),
      ),
    )
    .limit(1);
  if (existing) throw new Error("ALREADY_ENDORSED");

  const [row] = await db.insert(endorsements).values(input).returning();
  return row;
}

export async function listEndorsements(opts: {
  endorseeId?: string;
  endorserId?: string;
  categoryId?: string;
} = {}): Promise<EndorsementView[]> {
  const conditions: SQL[] = [];
  if (opts.endorseeId) conditions.push(eq(endorsements.endorseeId, opts.endorseeId));
  if (opts.endorserId) conditions.push(eq(endorsements.endorserId, opts.endorserId));
  if (opts.categoryId) conditions.push(eq(endorsements.categoryId, opts.categoryId));

  return db
    .select({
      ...getTableColumns(endorsements),
      categoryName: categories.name,
      endorserName: users.displayName,
    })
    .from(endorsements)
    .leftJoin(categories, eq(endorsements.categoryId, categories.id))
    .leftJoin(users, eq(endorsements.endorserId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(endorsements.createdAt));
}

export async function getReceivedEndorsements(endorseeId: string): Promise<EndorsementView[]> {
  return listEndorsements({ endorseeId });
}

export async function hasEndorsementForCategory(userId: string, categoryId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: endorsements.id })
    .from(endorsements)
    .where(and(eq(endorsements.endorseeId, userId), eq(endorsements.categoryId, categoryId)))
    .limit(1);
  return row !== undefined;
}
