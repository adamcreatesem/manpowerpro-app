import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAgency } from "./helpers";
import type { Id } from "./_generated/dataModel";

/** Office-wide audit trail: every mutation in the app writes an `activities`
 *  row, so this feed is the single place to see who did what across the desks. */
export const list = query({
  args: {
    actorId: v.optional(v.id("users")),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);

    let rows = await ctx.db
      .query("activities")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    rows.sort((a, b) => b.createdAt - a.createdAt);

    if (args.actorId) rows = rows.filter((r) => r.userId === args.actorId);
    if (args.action) rows = rows.filter((r) => r.action === args.action);

    const recent = rows.slice(0, 150);

    /* actor + candidate display names, batched */
    const userIds = [
      ...new Set(recent.map((r) => r.userId).filter((id): id is Id<"users"> => !!id)),
    ];
    const candidateIds = [
      ...new Set(
        recent.map((r) => r.candidateId).filter((id): id is Id<"candidates"> => !!id),
      ),
    ];
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const candidates = await Promise.all(candidateIds.map((id) => ctx.db.get(id)));

    const actorName = new Map(
      users
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map((u) => [u._id, u.name ?? "Staff member"]),
    );
    const candidateName = new Map(
      candidates
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [
          c._id,
          [c.firstName, c.lastName].filter(Boolean).join(" ") || "Candidate",
        ]),
    );

    /* filter metadata computed over the full (unfiltered-by-action) set */
    const actionCounts = new Map<string, number>();
    for (const r of rows) {
      actionCounts.set(r.action, (actionCounts.get(r.action) ?? 0) + 1);
    }
    const actions = [...actionCounts.entries()]
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count);

    return {
      rows: recent.map((r) => ({
        _id: r._id,
        action: r.action,
        description: r.description,
        createdAt: r.createdAt,
        actorName: r.userId ? (actorName.get(r.userId) ?? null) : null,
        candidateId: r.candidateId ?? null,
        candidateName: r.candidateId
          ? (candidateName.get(r.candidateId) ?? null)
          : null,
      })),
      actors: [...actorName.entries()].map(([userId, name]) => ({
        userId: userId as Id<"users">,
        name,
      })),
      actions,
      summary: {
        total: rows.length,
        actors: actorName.size,
        topAction: actions[0]?.action ?? null,
      },
    };
  },
});
