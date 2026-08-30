import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currencyValidator, feeStatusValidator } from "./schema";
import { requireAgency } from "./helpers";
import type { Id } from "./_generated/dataModel";

/** Placement fees, joined with candidate + employer names, plus a summary. */
export const list = query({
  args: { status: v.optional(feeStatusValidator) },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    let rows = await ctx.db
      .query("fees")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    if (args.status) rows = rows.filter((f) => f.status === args.status);
    rows.sort((a, b) => b.arrangedAt - a.arrangedAt);

    const candidateIds = [...new Set(rows.map((f) => f.candidateId))];
    const clientIds = [
      ...new Set(
        rows.map((f) => f.clientId).filter((x): x is Id<"clients"> => !!x),
      ),
    ];
    const candidates = await Promise.all(candidateIds.map((cid) => ctx.db.get(cid)));
    const clients = await Promise.all(clientIds.map((cid) => ctx.db.get(cid)));
    const candidateName = new Map(
      candidates
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [c._id, `${c.firstName} ${c.lastName}`]),
    );
    const clientName = new Map(
      clients
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [c._id, c.name]),
    );

    const fees = rows.map((f) => ({
      ...f,
      candidateName: candidateName.get(f.candidateId) ?? "Unknown",
      clientName: f.clientId ? (clientName.get(f.clientId) ?? null) : null,
    }));

    let outstandingCount = 0;
    const outstandingByCurrency: Record<string, number> = {};
    let paidCount = 0;
    const paidByCurrency: Record<string, number> = {};
    for (const f of fees) {
      if (f.status === "paid") {
        paidCount += 1;
        paidByCurrency[f.currency] = (paidByCurrency[f.currency] ?? 0) + f.amount;
      } else {
        outstandingCount += 1;
        outstandingByCurrency[f.currency] = (outstandingByCurrency[f.currency] ?? 0) + f.amount;
      }
    }

    return { fees, summary: { outstandingCount, outstandingByCurrency, paidCount, paidByCurrency } };
  },
});

export const create = mutation({
  args: {
    candidateId: v.id("candidates"),
    amount: v.number(),
    currency: currencyValidator,
    dueAt: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    let clientId: Id<"clients"> | undefined;
    if (candidate.jobOrderId) {
      const order = await ctx.db.get(candidate.jobOrderId);
      clientId = order?.clientId;
    }
    const now = Date.now();
    const id = await ctx.db.insert("fees", {
      agencyId,
      candidateId: args.candidateId,
      clientId,
      amount: args.amount,
      currency: args.currency,
      status: "arranged",
      arrangedAt: now,
      dueAt: args.dueAt,
      notes: args.notes,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "fee_created",
      description: `Placement fee of ${args.amount} ${args.currency} recorded`,
      createdAt: now,
    });
    return id;
  },
});

export const markPaid = mutation({
  args: { id: v.id("fees") },
  handler: async (ctx, { id }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const fee = await ctx.db.get(id);
    if (!fee || fee.agencyId !== agencyId) throw new Error("Fee not found");
    const now = Date.now();
    await ctx.db.patch(id, { status: "paid", paidAt: now });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: fee.candidateId,
      userId: user._id,
      action: "fee_paid",
      description: `Placement fee marked paid (${fee.amount} ${fee.currency})`,
      createdAt: now,
    });
  },
});
