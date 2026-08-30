import { query } from "./_generated/server";
import { ROLE_LABELS } from "./schema";
import { requireAgency } from "./helpers";
import { isExited } from "./pipeline";
import type { Doc, Id } from "./_generated/dataModel";

const DAY = 86_400_000;

/** Per-staff performance report — live numbers derived from candidates,
 *  tasks and activities, merged with the latest weekly staffMetrics row. */
export const performance = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);

    /* office roles only — owner, manager, staff */
    const users = (await ctx.db.query("users").collect()).filter(
      (u) =>
        u.agencyId === agencyId &&
        u.role !== undefined &&
        (u.role === "agency_owner" ||
          u.role === "agency_manager" ||
          u.role === "agency_staff"),
    );

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId,
    );
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();

    /* latest weekly metric row per staff member */
    const metricsByUser = new Map<Id<"users">, Doc<"staffMetrics">>();
    const metrics = await ctx.db
      .query("staffMetrics")
      .withIndex("by_agency_period", (q) => q.eq("agencyId", agencyId))
      .collect();
    for (const m of metrics) {
      const cur = metricsByUser.get(m.userId);
      if (!cur || m.periodEnd > cur.periodEnd) metricsByUser.set(m.userId, m);
    }

    const now = Date.now();
    const stuckThreshold = 21 * DAY;

    const rows = users.map((u) => {
      const assigned = candidates.filter((c) => c.assignedStaffId === u._id);
      const deployed = assigned.filter((c) => c.flightStat === "DEPARTED");
      const active = assigned.filter((c) => !isExited(c) && c.flightStat !== "DEPARTED");
      const openTasks = tasks.filter(
        (t) =>
          t.userId === u._id &&
          (t.status === "pending" || t.status === "in_progress"),
      ).length;
      const completedTasks = tasks.filter(
        (t) => t.userId === u._id && t.status === "completed",
      ).length;
      const activityCount = activities.filter((a) => a.userId === u._id).length;
      const stuck = active.filter((c) => {
        const entered = c.lastStatusChangeAt ?? c.contractCreatedAt ?? now;
        return now - entered > stuckThreshold;
      }).length;
      const avgStageDays = active.length
        ? Math.round(
            (active.reduce((sum, c) => {
              const entered = c.lastStatusChangeAt ?? c.contractCreatedAt ?? now;
              return sum + Math.max(0, (now - entered) / DAY);
            }, 0) /
              active.length) *
              10,
          ) / 10
        : 0;
      const metric = metricsByUser.get(u._id);

      return {
        userId: u._id,
        name: u.name ?? "Unnamed",
        email: u.email ?? null,
        role: u.role,
        roleLabel: u.role ? (ROLE_LABELS[u.role] ?? u.role) : "—",
        assigned: assigned.length,
        deployed: deployed.length,
        active: active.length,
        conversion: assigned.length
          ? Math.round((deployed.length / assigned.length) * 100)
          : 0,
        openTasks,
        completedTasks,
        activityCount,
        stuck,
        avgStageDays,
        metric: metric
          ? {
              totalActions: metric.totalActions,
              candidatesCreated: metric.candidatesCreated,
              statusChanges: metric.statusChanges,
              proceduresCompleted: metric.proceduresCompleted,
              documentsProcessed: metric.documentsProcessed,
              candidatesDeployed: metric.candidatesDeployed,
              conversionRate: metric.conversionRate ?? null,
              avgStatusChangeTime: metric.avgStatusChangeTime ?? null,
              rejectionRate: metric.rejectionRate ?? null,
            }
          : null,
      };
    });

    rows.sort(
      (a, b) => b.deployed - a.deployed || b.assigned - a.assigned || a.name.localeCompare(b.name),
    );

    return {
      rows,
      summary: {
        staff: users.length,
        assigned: rows.reduce((s, r) => s + r.assigned, 0),
        deployed: rows.reduce((s, r) => s + r.deployed, 0),
        openTasks: rows.reduce((s, r) => s + r.openTasks, 0),
        stuck: rows.reduce((s, r) => s + r.stuck, 0),
      },
    };
  },
});
