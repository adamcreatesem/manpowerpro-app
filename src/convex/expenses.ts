import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currencyValidator, expenseTypeValidator, paidByValidator } from "./schema";
import { requireAgency } from "./helpers";

export const list = query({
  args: {
    expenseType: v.optional(expenseTypeValidator),
    paidBy: v.optional(paidByValidator),
  },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    let rows = await ctx.db.query("candidateExpenses").collect();
    rows = rows.filter((e) => e.agencyId === agencyId);
    if (args.expenseType) rows = rows.filter((e) => e.expenseType === args.expenseType);
    if (args.paidBy) rows = rows.filter((e) => e.paidBy === args.paidBy);
    rows.sort((a, b) => b.createdAt - a.createdAt);

    const candidateIds = [...new Set(rows.map((e) => e.candidateId))];
    const candidates = await Promise.all(
      candidateIds.map((cid) => ctx.db.get(cid)),
    );
    const candidateName = new Map(
      candidates
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [c._id, `${c.firstName} ${c.lastName}`]),
    );

    const expenses = rows.map((e) => ({
      ...e,
      candidateName: candidateName.get(e.candidateId) ?? "Unknown",
    }));

    const byCurrency: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPaidBy: Record<string, number> = {};
    for (const e of expenses) {
      byCurrency[e.currency] = (byCurrency[e.currency] ?? 0) + e.amount;
      byType[e.expenseType] = (byType[e.expenseType] ?? 0) + 1;
      byPaidBy[e.paidBy] = (byPaidBy[e.paidBy] ?? 0) + e.amount;
    }

    return {
      expenses,
      summary: {
        byCurrency,
        byType,
        byPaidBy,
        totalCount: expenses.length,
      },
    };
  },
});

export const create = mutation({
  args: {
    candidateId: v.id("candidates"),
    expenseType: expenseTypeValidator,
    description: v.string(),
    amount: v.number(),
    currency: currencyValidator,
    paidBy: paidByValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    const id = await ctx.db.insert("candidateExpenses", {
      agencyId,
      candidateId: args.candidateId,
      jobOrderId: candidate.jobOrderId ?? undefined,
      expenseType: args.expenseType,
      description: args.description,
      amount: args.amount,
      currency: args.currency,
      paidBy: args.paidBy,
      notes: args.notes,
      createdAt: now,
      createdBy: user._id,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "expense_created",
      description: `Expense recorded: ${args.description} (${args.amount} ${args.currency}, ${args.paidBy})`,
      createdAt: now,
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("candidateExpenses") },
  handler: async (ctx, { id }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const expense = await ctx.db.get(id);
    if (!expense || expense.agencyId !== agencyId) {
      throw new Error("Expense not found");
    }
    await ctx.db.delete(id);
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: expense.candidateId,
      userId: user._id,
      action: "expense_removed",
      description: `Expense removed: ${expense.description} (${expense.amount} ${expense.currency})`,
      createdAt: Date.now(),
    });
  },
});