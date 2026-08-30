import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { returnStatusValidator } from "./schema";
import { requireAgency } from "./helpers";

const isoDate = (ts: number) => new Date(ts).toISOString().slice(0, 10);

export type ReturnStatus = "on_site" | "completed" | "early_return" | "absconded";

interface PostDeploymentPatch {
  arrivalConfirmationDate?: string;
  employerName?: string;
  employerFeedback?: string;
  firstMonthCheckDate?: string;
  salaryStartDate?: string;
  firstSalaryReceived?: boolean;
  firstSalaryDate?: string;
  grievanceReported?: boolean;
  grievanceDescription?: string;
  grievanceResolved?: boolean;
  grievanceResolvedDate?: string;
  contractCompletionDate?: string;
  contractRenewed?: boolean;
  repatriationDate?: string;
  repatriationReason?: string;
  returnStatus?: ReturnStatus;
  notes?: string;
}

/** Every deployed candidate and their after-arrival record. */
export const list = query({
  args: { filter: v.optional(v.union(v.literal("all"), v.literal("attention"), v.literal("returned"))) },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);

    const candidates = (await ctx.db.query("candidates").collect()).filter(
      (c) => c.agencyId === agencyId,
    );
    const deployed = candidates.filter(
      (c) => c.flightStat === "DEPARTED" || c.flightStat === "ARRIVED",
    );

    const records = await ctx.db.query("postDeployment").collect();
    const recordByCandidate = new Map(records.map((r) => [r.candidateId, r]));

    const rows = deployed.map((c) => {
      const r = recordByCandidate.get(c._id);
      const grievanceOpen =
        !!r?.grievanceReported && !r.grievanceResolved;
      const needsIntake = !r?.arrivalConfirmationDate;
      const attention = needsIntake || grievanceOpen || r?.firstSalaryReceived === false;
      return {
        candidateId: c._id,
        candidateName: `${c.firstName} ${c.lastName}`,
        passportNumber: c.passportNumber,
        occupation: c.occupation,
        deployedAt: c.deployedAt,
        pro: c.pro,
        record: r ?? null,
        grievanceOpen,
        needsIntake,
        attention,
      };
    });

    rows.sort((a, b) => (b.deployedAt ?? 0) - (a.deployedAt ?? 0));

    const filtered =
      args.filter === "attention"
        ? rows.filter((r) => r.attention)
        : args.filter === "returned"
          ? rows.filter(
              (r) =>
                r.record?.returnStatus === "early_return" ||
                r.record?.returnStatus === "absconded" ||
                r.record?.returnStatus === "completed",
            )
          : rows;

    const summary = {
      total: deployed.length,
      withRecord: rows.filter((r) => r.record).length,
      needingIntake: rows.filter((r) => r.needsIntake).length,
      grievancesOpen: rows.filter((r) => r.grievanceOpen).length,
      salaryPending: rows.filter((r) => r.record?.firstSalaryReceived === false).length,
      earlyReturns: rows.filter(
        (r) =>
          r.record?.returnStatus === "early_return" ||
          r.record?.returnStatus === "absconded",
      ).length,
    };

    return { rows: filtered, summary };
  },
});

/** Create or update the after-arrival record for one candidate. */
export const save = mutation({
  args: {
    candidateId: v.id("candidates"),
    patch: v.object({
      arrivalConfirmationDate: v.optional(v.string()),
      employerName: v.optional(v.string()),
      employerFeedback: v.optional(v.string()),
      firstMonthCheckDate: v.optional(v.string()),
      salaryStartDate: v.optional(v.string()),
      firstSalaryReceived: v.optional(v.boolean()),
      firstSalaryDate: v.optional(v.string()),
      grievanceReported: v.optional(v.boolean()),
      grievanceDescription: v.optional(v.string()),
      grievanceResolved: v.optional(v.boolean()),
      grievanceResolvedDate: v.optional(v.string()),
      contractCompletionDate: v.optional(v.string()),
      contractRenewed: v.optional(v.boolean()),
      repatriationDate: v.optional(v.string()),
      repatriationReason: v.optional(v.string()),
      returnStatus: v.optional(returnStatusValidator),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("postDeployment")
      .filter((q) => q.eq(q.field("candidateId"), args.candidateId))
      .first();

    const patch = { ...args.patch } as PostDeploymentPatch;
    const clean: Record<string, unknown> = {};
    for (const [k, value] of Object.entries(patch)) {
      if (value !== undefined) clean[k] = value;
    }

    if (existing) {
      await ctx.db.patch(existing._id, { ...clean, updatedAt: now });
      await ctx.db.insert("activities", {
        agencyId,
        candidateId: args.candidateId,
        userId: user._id,
        action: "aftercare_updated",
        description: `After-arrival record updated for ${candidate.firstName} ${candidate.lastName}`,
        createdAt: now,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("postDeployment", {
      candidateId: args.candidateId,
      ...clean,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "aftercare_created",
      description: `After-arrival record opened for ${candidate.firstName} ${candidate.lastName}`,
      createdAt: now,
    });
    return id;
  },
});

/** Quick action — mark a reported grievance as resolved. */
export const resolveGrievance = mutation({
  args: { id: v.id("postDeployment") },
  handler: async (ctx, { id }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const record = await ctx.db.get(id);
    if (!record) throw new Error("Record not found");
    const candidate = await ctx.db.get(record.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    await ctx.db.patch(id, {
      grievanceResolved: true,
      grievanceResolvedDate: isoDate(now),
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: record.candidateId,
      userId: user._id,
      action: "grievance_resolved",
      description: `Grievance resolved for ${candidate.firstName} ${candidate.lastName}`,
      createdAt: now,
    });
  },
});

/** Quick action — confirm the first salary was received. */
export const markSalaryReceived = mutation({
  args: { id: v.id("postDeployment") },
  handler: async (ctx, { id }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const record = await ctx.db.get(id);
    if (!record) throw new Error("Record not found");
    const candidate = await ctx.db.get(record.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    await ctx.db.patch(id, {
      firstSalaryReceived: true,
      firstSalaryDate: record.firstSalaryDate ?? isoDate(now),
      updatedAt: now,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: record.candidateId,
      userId: user._id,
      action: "salary_confirmed",
      description: `First salary confirmed for ${candidate.firstName} ${candidate.lastName}`,
      createdAt: now,
    });
  },
});
