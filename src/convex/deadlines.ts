import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAgency } from "./helpers";
import { isExited } from "./pipeline";

const DAY = 86_400_000;
const DUE_SOON_DAYS = 14;
const SLA_TARGET_DAYS = 30;

const parseDate = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const ts = new Date(`${s}T00:00:00`).getTime();
  return Number.isFinite(ts) ? ts : null;
};

export type DeadlineKind =
  | "medical"
  | "insurance"
  | "visa"
  | "fee"
  | "task"
  | "sla";

export interface DeadlineItem {
  key: string;
  kind: DeadlineKind;
  title: string;
  subtitle: string;
  candidateId: string | null;
  candidateName: string | null;
  dueAt: number;
  daysLeft: number;
  status: "overdue" | "due_soon" | "upcoming";
}

/** Everything that expires or is due — immigration-style docketing. */
export const list = query({
  args: { kind: v.optional(v.union(...([...["medical", "insurance", "visa", "fee", "task", "sla"]] as const).map((k) => v.literal(k)))) },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    const now = Date.now();
    const items: DeadlineItem[] = [];

    const candidates = (await ctx.db.query("candidates").collect()).filter(
      (c) => c.agencyId === agencyId,
    );
    const nameOf = (id: string) => {
      const c = candidates.find((x) => x._id === id);
      return c ? `${c.firstName} ${c.lastName}` : null;
    };

    /* Medical certificates — expire and block deployment */
    for (const c of candidates) {
      const ts = parseDate(c.medicalExpiryDate);
      if (ts === null || c.medical !== "FIT") continue;
      items.push({
        key: `medical-${c._id}`,
        kind: "medical",
        title: "Medical certificate expires",
        subtitle: c.medicalExpiryDate ?? "",
        candidateId: c._id,
        candidateName: `${c.firstName} ${c.lastName}`,
        dueAt: ts,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Placement insurance */
    for (const c of candidates) {
      const ts = parseDate(c.insuranceExpiryDate);
      if (ts === null) continue;
      items.push({
        key: `insurance-${c._id}`,
        kind: "insurance",
        title: "Placement insurance expires",
        subtitle: c.insuranceExpiryDate ?? "",
        candidateId: c._id,
        candidateName: `${c.firstName} ${c.lastName}`,
        dueAt: ts,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Issued visas — track the validity window */
    const visas = await ctx.db.query("visaApplications").collect();
    for (const visa of visas) {
      if (visa.status !== "issued") continue;
      const candidate = candidates.find((c) => c._id === visa.candidateId);
      if (!candidate) continue;
      const ts = parseDate(visa.expiryDate);
      if (ts === null) continue;
      items.push({
        key: `visa-${visa._id}`,
        kind: "visa",
        title: `Visa ${visa.visaNumber ?? ""} expires`.trim(),
        subtitle: visa.expiryDate ?? "",
        candidateId: candidate._id,
        candidateName: `${candidate.firstName} ${candidate.lastName}`,
        dueAt: ts,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Placement fee due dates */
    const fees = (await ctx.db.query("fees").collect()).filter(
      (f) => f.agencyId === agencyId && f.status === "arranged" && f.dueAt,
    );
    for (const fee of fees) {
      items.push({
        key: `fee-${fee._id}`,
        kind: "fee",
        title: "Placement fee due",
        subtitle: `${fee.amount.toLocaleString("en-US")} ${fee.currency}`,
        candidateId: fee.candidateId,
        candidateName: nameOf(fee.candidateId),
        dueAt: fee.dueAt as number,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Staff task deadlines */
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) =>
        t.agencyId === agencyId &&
        (t.status === "pending" || t.status === "in_progress") &&
        t.dueDate,
    );
    for (const task of tasks) {
      items.push({
        key: `task-${task._id}`,
        kind: "task",
        title: task.title,
        subtitle: task.relatedCandidateId
          ? nameOf(task.relatedCandidateId) ?? "Desk task"
          : "Desk task",
        candidateId: task.relatedCandidateId ?? null,
        candidateName: task.relatedCandidateId ? nameOf(task.relatedCandidateId) : null,
        dueAt: task.dueDate as number,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Deployment SLA — contract → 30-day target */
    for (const c of candidates) {
      if (!c.contractCreatedAt) continue;
      if (c.flightStat === "DEPARTED" || isExited(c)) continue;
      const target = c.contractCreatedAt + SLA_TARGET_DAYS * DAY;
      items.push({
        key: `sla-${c._id}`,
        kind: "sla",
        title: "Deployment target",
        subtitle: `Contract day ${Math.max(
          0,
          Math.floor((now - c.contractCreatedAt) / DAY),
        )} of ${SLA_TARGET_DAYS}`,
        candidateId: c._id,
        candidateName: `${c.firstName} ${c.lastName}`,
        dueAt: target,
        daysLeft: 0,
        status: "upcoming",
      });
    }

    /* Finalize: days left + status + sort */
    for (const item of items) {
      const daysLeft = Math.ceil((item.dueAt - now) / DAY);
      item.daysLeft = daysLeft;
      item.status = daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due_soon" : "upcoming";
    }
    items.sort((a, b) => a.dueAt - b.dueAt);

    const filtered = args.kind ? items.filter((i) => i.kind === args.kind) : items;

    const summary = {
      overdue: filtered.filter((i) => i.status === "overdue").length,
      dueSoon: filtered.filter((i) => i.status === "due_soon").length,
      upcoming: filtered.filter((i) => i.status === "upcoming").length,
      total: filtered.length,
    };

    return { items: filtered, summary };
  },
});
