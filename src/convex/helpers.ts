import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

/** Throws if the caller is not signed in and returns their user id. */
export async function requireUser(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  return userId;
}

/** Returns the current user doc, or null when signed out. */
export async function getCurrentUser(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;
  return ctx.db.get(userId);
}

/** Requires a signed-in user that belongs to an agency. Returns user + agencyId. */
export async function requireAgency(ctx: QueryCtx) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  if (!user.agencyId) throw new Error("No agency attached to this account");
  return { user, agencyId: user.agencyId };
}

/** Requires a signed-in user with one of the given roles. */
export async function requireRole(ctx: QueryCtx, roles: readonly string[]) {
  const user = await getCurrentUser(ctx);
  if (!user) throw new Error("Not authenticated");
  if (!user.role || !roles.includes(user.role)) {
    throw new Error("Forbidden — insufficient role");
  }
  return user;
}

/**
 * Fetches display info for a set of users, deduplicated.
 * Returns a plain record — Maps cannot cross the Convex wire.
 */
export async function peopleMap(
  ctx: QueryCtx,
  ids: (Id<"users"> | null | undefined)[],
): Promise<Record<string, { name?: string; email?: string }>> {
  const unique = [...new Set(ids.filter((id): id is Id<"users"> => !!id))];
  const docs = await Promise.all(unique.map((id) => ctx.db.get(id)));
  const out: Record<string, { name?: string; email?: string }> = {};
  for (const d of docs) {
    if (d) out[d._id] = { name: d.name, email: d.email };
  }
  return out;
}
