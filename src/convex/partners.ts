import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAgency } from "./helpers";
import { isExited } from "./pipeline";
import type { Id } from "./_generated/dataModel";

/** Saudi-side intermediaries (PROs) the office works through. The table has
 *  no agencyId — partners are shared records — so the office view lists all
 *  and derives per-partner workload from candidates' `pro` sheet column and
 *  job orders' partnerAgencyId. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAgency(ctx);

    const partners = await ctx.db.query("partnerAgencies").collect();
    const orders = await ctx.db.query("jobOrders").collect();
    const candidates = await ctx.db.query("candidates").collect();

    const ordersByPartner = new Map<Id<"partnerAgencies">, typeof orders>();
    for (const o of orders) {
      if (!o.partnerAgencyId) continue;
      ordersByPartner.set(o.partnerAgencyId, [
        ...(ordersByPartner.get(o.partnerAgencyId) ?? []),
        o,
      ]);
    }

    return partners
      .map((p) => {
        const os = ordersByPartner.get(p._id) ?? [];
        const pro = (p.name ?? "").trim().toLowerCase();
        const files = candidates.filter((c) =>
          (c.pro ?? "").trim().toLowerCase().includes(pro),
        );
        const deployed = files.filter((c) => c.flightStat === "DEPARTED").length;
        const active = files.filter((c) => !isExited(c)).length;
        return {
          ...p,
          files: files.length,
          activeFiles: active,
          deployed,
          orders: os.length,
          openOrders: os.filter(
            (o) => o.status === "open" || o.status === "in_progress",
          ).length,
          filledTotal: os.reduce((n, o) => n + (o.filled ?? 0), 0),
        };
      })
      .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    saudiLicenseNumber: v.optional(v.string()),
    country: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAgency(ctx);
    if (!args.name.trim()) throw new Error("Partner name is required");
    const code = args.name
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 6) || "PARTNER";
    const id = await ctx.db.insert("partnerAgencies", {
      name: args.name.trim(),
      code,
      country: args.country ?? "Saudi Arabia",
      contactPerson: args.contactPerson,
      email: args.email,
      phone: args.phone,
      isActive: true,
      saudiLicenseNumber: args.saudiLicenseNumber,
    });
    await ctx.db.insert("activities", {
      userId: user._id,
      action: "partner_created",
      description: `New Saudi intermediary added: ${args.name.trim()}`,
      createdAt: Date.now(),
    });
    return id;
  },
});
