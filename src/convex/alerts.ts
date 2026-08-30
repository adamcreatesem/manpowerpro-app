import { query } from "./_generated/server";
import { requireAgency } from "./helpers";

const DAY = 86_400_000;

type Level = "expired" | "today" | "soon";

interface AlertItem {
  key: string;
  kind: "medical" | "task" | "fee";
  level: Level;
  title: string;
  detail: string;
  route: string;
  timestamp: number;
}

/** Level of an ISO date (yyyy-mm-dd) relative to today. */
function dateLevel(iso: string, soonDays: number): Level | null {
  const t = new Date(`${iso}T00:00:00`).getTime();
  if (Number.isNaN(t)) return null;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const days = Math.floor((t - startOfToday) / DAY);
  if (days < 0) return "expired";
  if (days === 0) return "today";
  if (days <= soonDays) return "soon";
  return null;
}

/** Things the office needs to act on: expiring medicals, overdue tasks,
 *  fees coming due. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);
    const now = Date.now();
    const items: AlertItem[] = [];

    /* medical FIT certificates expiring */
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    for (const c of candidates) {
      if (c.medical !== "FIT" || !c.medicalExpiryDate) continue;
      const level = dateLevel(c.medicalExpiryDate, 14);
      if (!level) continue;
      items.push({
        key: `medical-${c._id}`,
        kind: "medical",
        level,
        title: `${c.firstName} ${c.lastName} — medical expiring`,
        detail: `FIT until ${c.medicalExpiryDate} · ${
          c.passportNumber ?? "no passport"
        }`,
        route: `/app/candidates/${c._id}`,
        timestamp: new Date(`${c.medicalExpiryDate}T00:00:00`).getTime(),
      });
    }

    /* tasks past their due date */
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId && (t.status === "pending" || t.status === "in_progress") && t.dueDate !== undefined,
    );
    const candidateById = new Map(candidates.map((c) => [c._id, c]));
    for (const t of tasks) {
      if (t.dueDate === undefined || t.dueDate >= now) continue;
      const cand = t.relatedCandidateId ? candidateById.get(t.relatedCandidateId) : undefined;
      items.push({
        key: `task-${t._id}`,
        kind: "task",
        level: "expired",
        title: t.title,
        detail: `Task overdue · ${cand ? `${cand.firstName} ${cand.lastName}` : "General"}`,
        route: t.relatedCandidateId ? `/app/candidates/${t.relatedCandidateId}` : "/app/tasks",
        timestamp: t.dueDate,
      });
    }

    /* fees due soon or late */
    const fees = await ctx.db
      .query("fees")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    for (const f of fees) {
      if (f.status !== "arranged" || !f.dueAt) continue;
      const diffDays = Math.ceil((f.dueAt - now) / DAY);
      const level: Level | null = diffDays < 0 ? "expired" : diffDays === 0 ? "today" : diffDays <= 3 ? "soon" : null;
      if (!level) continue;
      const cand = candidateById.get(f.candidateId);
      items.push({
        key: `fee-${f._id}`,
        kind: "fee",
        level,
        title: `Placement fee due — ${cand ? `${cand.firstName} ${cand.lastName}` : "Unknown"}`,
        detail: `${f.amount.toLocaleString("en-US")} ${f.currency} · arranged ${new Date(f.arrangedAt).toLocaleDateString("en-GB")}`,
        route: "/app/fees",
        timestamp: f.dueAt,
      });
    }

    const order: Record<Level, number> = { expired: 0, today: 1, soon: 2 };
    items.sort(
      (a, b) =>
        order[a.level] - order[b.level] || a.timestamp - b.timestamp,
    );

    const counts = {
      expired: items.filter((i) => i.level === "expired").length,
      today: items.filter((i) => i.level === "today").length,
      soon: items.filter((i) => i.level === "soon").length,
    };

    return { items, counts };
  },
});
