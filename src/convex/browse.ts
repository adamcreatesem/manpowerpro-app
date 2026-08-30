import { v } from "convex/values";
import { query } from "./_generated/server";
import { deriveStage } from "./pipeline";

/** Public directory of active, non-banned agencies. */
export const publicAgencies = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("agencies").collect();
    return rows
      .filter((a) => a.isActive && !a.isBanned)
      .map((a) => ({
        _id: a._id,
        name: a.name,
        code: a.code,
        country: a.country ?? null,
        address: a.address ?? null,
        contactEmail: a.contactEmail ?? null,
        licenseNumber: a.licenseNumber ?? null,
      }));
  },
});

/** Public candidate list for an agency (limited fields, no PIN/notes). */
export const publicCandidates = query({
  args: { agencyId: v.id("agencies"), search: v.optional(v.string()) },
  handler: async (ctx, { agencyId, search }) => {
    const agency = await ctx.db.get(agencyId);
    if (!agency || !agency.isActive || agency.isBanned) return null;
    let rows = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const q = search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        [c.firstName, c.lastName, c.passportNumber ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    return rows
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 50)
      .map((c) => ({
        _id: c._id,
        firstName: c.firstName,
        lastName: c.lastName,
        passportNumber: c.passportNumber ?? null,
        currentStatus: c.currentStatus,
        derivedStage: deriveStage(c).stage,
      }));
  },
});
