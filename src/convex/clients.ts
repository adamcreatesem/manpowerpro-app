import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAgency } from "./helpers";
import { deriveStage } from "./pipeline";
import type { Doc, Id } from "./_generated/dataModel";

/* -------------------------------------------------------------------------- */
/* Agency side — employer directory                                           */
/* -------------------------------------------------------------------------- */

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const orders = await ctx.db
      .query("jobOrders")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const fees = await ctx.db
      .query("fees")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();

    const ordersByClient = new Map<Id<"clients">, Doc<"jobOrders">[]>();
    for (const o of orders) {
      ordersByClient.set(o.clientId, [...(ordersByClient.get(o.clientId) ?? []), o]);
    }
    const clientIds = new Set(clients.map((c) => c._id));
    const orderIds = new Set(orders.map((o) => o._id));
    const placementsByOrder = new Map<Id<"jobOrders">, number>();
    for (const c of candidates) {
      if (c.jobOrderId && orderIds.has(c.jobOrderId)) {
        placementsByOrder.set(c.jobOrderId, (placementsByOrder.get(c.jobOrderId) ?? 0) + 1);
      }
    }
    const feesByClient = new Map<Id<"clients">, { count: number; amount: number }>();
    for (const f of fees) {
      if (f.status === "paid" || !f.clientId || !clientIds.has(f.clientId)) continue;
      const cur = feesByClient.get(f.clientId) ?? { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += f.amount;
      feesByClient.set(f.clientId, cur);
    }

    return clients.map((c) => {
      const os = ordersByClient.get(c._id) ?? [];
      return {
        ...c,
        openOrders: os.filter((o) => o.status === "open" || o.status === "in_progress").length,
        totalOrders: os.length,
        placements: os.reduce((n, o) => n + (placementsByOrder.get(o._id) ?? 0), 0),
        feesOutstanding: feesByClient.get(c._id)?.amount ?? 0,
        feesOutstandingCount: feesByClient.get(c._id)?.count ?? 0,
      };
    });
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    industry: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    if (!args.name.trim()) throw new Error("Employer name is required");
    const id = await ctx.db.insert("clients", {
      agencyId,
      name: args.name.trim(),
      contactPerson: args.contactPerson,
      email: args.email,
      phone: args.phone,
      industry: args.industry,
      address: args.address,
      isActive: true,
      leadStatus: "new",
    });
    await ctx.db.insert("activities", {
      agencyId,
      userId: user._id,
      action: "client_created",
      description: `New employer added: ${args.name.trim()}`,
      createdAt: Date.now(),
    });
    return id;
  },
});

/* -------------------------------------------------------------------------- */
/* Client portal — the client's own orders and candidate progress.            */
/* -------------------------------------------------------------------------- */

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user || user.role !== "client" || !user.clientId) {
      throw new Error("Client account required");
    }
    const client = await ctx.db.get(user.clientId);
    if (!client) throw new Error("Client not found");

    const orders = await ctx.db
      .query("jobOrders")
      .withIndex("by_client", (q) => q.eq("clientId", user.clientId as Doc<"clients">["_id"]))
      .collect();

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", client.agencyId))
      .collect();

    const byOrder = new Map<string, Doc<"candidates">[]>();
    const orderIds = new Set(orders.map((o) => o._id));
    for (const cand of candidates) {
      if (cand.jobOrderId && orderIds.has(cand.jobOrderId)) {
        byOrder.set(cand.jobOrderId, [...(byOrder.get(cand.jobOrderId) ?? []), cand]);
      }
    }

    return {
      client: {
        _id: client._id,
        name: client.name,
        contactPerson: client.contactPerson ?? null,
        nitaqatColor: client.nitaqatColor ?? null,
      },
      orders: orders.map((o) => ({
        _id: o._id,
        title: o.title,
        position: o.position,
        quantity: o.quantity,
        filled: o.filled,
        status: o.status,
        location: o.location ?? null,
        salary: o.salary ?? null,
        contractDuration: o.contractDuration ?? null,
        candidates: (byOrder.get(o._id) ?? []).map((c) => ({
          _id: c._id,
          firstName: c.firstName,
          lastName: c.lastName,
          passportNumber: c.passportNumber ?? null,
          currentStatus: c.currentStatus,
          derivedStage: deriveStage(c).stage,
          flightStat: c.flightStat ?? null,
        })),
      })),
    };
  },
});
