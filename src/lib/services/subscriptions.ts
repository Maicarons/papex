import { db } from "@/lib/db";
import { subscriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { SubscriptionInput } from "@/lib/validations";

export async function listSubscriptions(userId: string) {
  return db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
}

export async function isSubscribed(userId: string, input: SubscriptionInput) {
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.type, input.type),
        eq(subscriptions.refId, input.refId),
      ),
    );
  return !!row;
}

/** Create if absent, delete if present. Returns the new state. */
export async function toggleSubscription(userId: string, input: SubscriptionInput) {
  const existing = await isSubscribed(userId, input);
  if (existing) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.type, input.type),
          eq(subscriptions.refId, input.refId),
        ),
      );
    return false;
  }
  await db.insert(subscriptions).values({
    userId,
    type: input.type,
    refId: input.refId,
  });
  return true;
}
