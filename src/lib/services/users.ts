import { db } from "@/lib/db";
import { users, papers, subscriptions, bookmarks } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { RegisterInput, LoginInput, UpdateProfileInput } from "@/lib/validations";

export async function createUser(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({
      username: input.username,
      email: input.email ?? `${input.username}@local`,
      displayName: input.displayName ?? input.username,
      passwordHash,
    })
    .returning();
  return user;
}

export async function verifyLogin(input: LoginInput) {
  const [user] = await db
    .select()
    .from(users)
    .where(sql`(${users.username} = ${input.identifier} OR ${users.email} = ${input.identifier})`);
  if (!user) return null;
  const ok = await verifyPassword(input.password, user.passwordHash);
  return ok ? user : null;
}

export async function getUserByUsername(username: string) {
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user ?? null;
}

/** Update the current user's public profile. Empty optional strings are stored as NULL. */
export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const [user] = await db
    .update(users)
    .set({
      displayName: input.displayName,
      bio: input.bio || null,
      institution: input.institution || null,
      website: input.website || null,
      location: input.location || null,
      orcid: input.orcid || null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();
  return user;
}

export async function getUserProfile(username: string) {
  const user = await getUserByUsername(username);
  if (!user) return null;
  const userPapers = await db
    .select()
    .from(papers)
    .where(eq(papers.createdById, user.id))
    .orderBy(desc(papers.createdAt));
  const subCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));
  const bookmarkCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bookmarks)
    .where(eq(bookmarks.userId, user.id));
  return {
    user,
    papers: userPapers,
    subscriptionCount: subCount[0]?.count ?? 0,
    bookmarkCount: bookmarkCount[0]?.count ?? 0,
  };
}
