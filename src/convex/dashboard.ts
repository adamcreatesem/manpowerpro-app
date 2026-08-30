import { query } from "./_generated/server";
import { requireAgency } from "./helpers";
import { deriveStage, isExited } from "./pipeline";
import type { Doc } from "./_generated/dataModel";

const ACTIVITY_META: Record<string, { type: string; verb: string }> = {
  file_opened: { type: "document", verb: "opened a file for" },
  candidate_created: { type: "document", verb: "opened a file for" },
  candidate_updated: { type: "stage", verb: "updated" },
  stage_advanced: { type: "stage", verb: "moved" },
  task_created: { type: "task", verb: "created a task for" },
  task_completed: { type: "task", verb: "completed a task for" },
  fee_created: { type: "fee", verb: "recorded a placement fee for" },
  fee_paid: { type: "fee", verb: "marked a fee paid for" },
  client_created: { type: "system", verb: "added an employer" },
};

export const overview = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();

    const byStage: Record<string, number> = {};
    let deployed = 0;
    let exited = 0;
    let rejected = 0;
    for (const c of candidates) {
      const stage = deriveStage(c).stage;
      byStage[stage] = (byStage[stage] ?? 0) + 1;
      if (c.flightStat === "DEPARTED") deployed += 1;
      if (stage === "Exited") exited += 1;
      if (c.currentStatus === "rejected") rejected += 1;
    }
    const active = candidates.filter((c) => !isExited(c) && c.flightStat !== "DEPARTED").length;

    /* staff tasks */
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId,
    );
    const openTasks = tasks.filter(
      (t) => t.status === "pending" || t.status === "in_progress",
    );
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const dueToday = openTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate >= startOfToday && t.dueDate < startOfToday + 86_400_000,
    ).length;
    const overdue = openTasks.filter(
      (t) => t.dueDate !== undefined && t.dueDate < startOfToday,
    ).length;

    /* placement fees */
    const fees = await ctx.db
      .query("fees")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    let outstandingCount = 0;
    const outstandingByCurrency: Record<string, number> = {};
    for (const f of fees) {
      if (f.status === "paid") continue;
      outstandingCount += 1;
      outstandingByCurrency[f.currency] = (outstandingByCurrency[f.currency] ?? 0) + f.amount;
    }

    /* recent activity with actor + candidate names */
    const rawRecent = await ctx.db
      .query("activities")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .order("desc")
      .take(12);
    const candidateById = new Map(candidates.map((c) => [c._id, c]));
    const userIds = rawRecent.map((a) => a.userId).filter((x): x is NonNullable<typeof x> => !!x);
    const uniqueUserIds = [...new Set(userIds)];
    const users = await Promise.all(uniqueUserIds.map((uid) => ctx.db.get(uid)));
    const userNames = new Map(users.filter((u): u is NonNullable<typeof u> => !!u).map((u) => [u._id, u.name]));
    const recent = rawRecent.map((a) => {
      const meta = ACTIVITY_META[a.action] ?? { type: "system", verb: "updated" };
      const cand = a.candidateId ? candidateById.get(a.candidateId) : undefined;
      const candName = cand ? `${cand.firstName} ${cand.lastName}` : null;
      let text: string;
      if (meta.type === "system") {
        text = a.description;
      } else if (candName) {
        text = `${meta.verb} ${candName}`;
      } else {
        text = a.description;
      }
      return {
        _id: a._id,
        type: meta.type,
        text,
        candidateId: cand?._id ?? null,
        candidateName: candName,
        actorName: a.userId ? (userNames.get(a.userId) ?? null) : null,
        createdAt: a.createdAt,
      };
    });

    /* upcoming departures */
    const departures = await ctx.db
      .query("departures")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const upcoming = departures
      .filter(
        (d) =>
          d.status !== "departed" &&
          d.status !== "cancelled" &&
          d.departureDate !== undefined &&
          d.departureDate >= Date.now() - 86_400_000,
      )
      .sort((a, b) => (a.departureDate ?? 0) - (b.departureDate ?? 0))
      .slice(0, 5)
      .map((d) => {
        const cand = candidateById.get(d.candidateId);
        return {
          _id: d._id,
          flightNumber: d.flightNumber ?? null,
          departureDate: d.departureDate,
          destination: d.destination ?? null,
          status: d.status,
          candidateId: d.candidateId,
          candidateName: cand ? `${cand.firstName} ${cand.lastName}` : "Unknown",
        };
      });

    return {
      totals: {
        candidates: candidates.length,
        active,
        deployed,
        exited,
        rejected,
        openTasks: openTasks.length,
        dueToday,
        overdue,
        outstandingFees: outstandingCount,
      },
      byStage,
      fees: {
        outstandingCount,
        outstandingByCurrency,
      },
      recent,
      upcomingDepartures: upcoming,
    };
  },
});
