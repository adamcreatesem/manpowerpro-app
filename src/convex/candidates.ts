import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  candidateStatusValidator,
  documentsCustodyValidator,
  flightStatValidator,
  lmisStatValidator,
  medicalStatusValidator,
  musStatValidator,
  trainingStatusValidator,
  visaStatusValidator,
  wakalahStatusValidator,
} from "./schema";
import { peopleMap, requireAgency } from "./helpers";
import {
  PIPELINE_STAGES,
  deriveDepartment,
  deriveStage,
  statusFromPipeline,
} from "./pipeline";
import type { Doc, Id } from "./_generated/dataModel";

type StageName = (typeof PIPELINE_STAGES)[number];

/* -------------------------------------------------------------------------- */
/* Editable candidate fields (raw pipeline sheet values + basics)             */
/* -------------------------------------------------------------------------- */

const candidatePatchValidator = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  nationality: v.optional(v.string()),
  gender: v.optional(v.string()),
  occupation: v.optional(v.string()),
  region: v.optional(v.string()),
  notes: v.optional(v.string()),
  documents: v.optional(documentsCustodyValidator),
  musStat: v.optional(musStatValidator),
  lmisStat: v.optional(lmisStatValidator),
  medical: v.optional(medicalStatusValidator),
  wakalah: v.optional(wakalahStatusValidator),
  visaStatus: v.optional(visaStatusValidator),
  training: v.optional(trainingStatusValidator),
  bookedFor: v.optional(v.string()),
  flightStat: v.optional(flightStatValidator),
  pro: v.optional(v.string()),
  laborId: v.optional(v.string()),
  musanedId: v.optional(v.string()),
  wafidRefNumber: v.optional(v.string()),
  medicalExpiryDate: v.optional(v.string()),
  tasheerAppointmentDate: v.optional(v.string()),
  insuranceProvider: v.optional(v.string()),
  insurancePolicyNumber: v.optional(v.string()),
  assignedStaffId: v.optional(v.id("users")),
  contractCreatedAt: v.optional(v.number()),
  deployedAt: v.optional(v.number()),
});

const FIELD_LABELS: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  phone: "Phone",
  email: "Email",
  dateOfBirth: "Date of birth",
  nationality: "Nationality",
  gender: "Gender",
  occupation: "Occupation",
  region: "Region",
  notes: "Notes",
  documents: "Documents",
  musStat: "Musaned status",
  lmisStat: "LMIS status",
  medical: "Medical",
  wakalah: "Wakalah",
  visaStatus: "Visa status",
  training: "Training",
  bookedFor: "Booked for",
  flightStat: "Flight",
  pro: "PRO",
  laborId: "Labor ID",
  musanedId: "Musaned ID",
  wafidRefNumber: "Wafid reference",
  medicalExpiryDate: "Medical expiry",
  tasheerAppointmentDate: "Tasheer appointment",
  insuranceProvider: "Insurance provider",
  insurancePolicyNumber: "Insurance policy",
  assignedStaffId: "Assigned staff",
  contractCreatedAt: "Contract date",
  deployedAt: "Deployment date",
};

const fmt = (x: unknown): string => (x === null || x === undefined ? "" : String(x));

/** Applies a set of field changes, keeps derived status in sync, and writes
 *  the audit trail (auditLogs rows + one activities entry naming the actor). */
async function commitChanges(
  ctx: MutationCtx,
  candidateId: Id<"candidates">,
  changes: { key: string; from: unknown; to: unknown }[],
  action: "candidate_updated" | "stage_advanced",
  summary: string,
) {
  const { agencyId, user } = await requireAgency(ctx);
  const candidate = await ctx.db.get(candidateId);
  if (!candidate || candidate.agencyId !== agencyId) {
    throw new Error("Candidate not found");
  }

  const patchDoc: Record<string, unknown> = {};
  for (const c of changes) patchDoc[c.key] = c.to;

  const merged = { ...candidate, ...patchDoc };
  const before = deriveStage(candidate).stage;
  const after = deriveStage(merged).stage;
  const stageChanged = before !== after;
  const now = Date.now();

  await ctx.db.patch(candidateId, {
    ...patchDoc,
    currentStatus: statusFromPipeline(merged),
    lastUpdatedBy: user._id,
    ...(stageChanged ? { lastStatusChangeAt: now } : {}),
  });

  for (const c of changes) {
    await ctx.db.insert("auditLogs", {
      agencyId,
      userId: user._id,
      action: `candidate.${c.key}`,
      entityType: "candidate",
      entityId: candidateId,
      description: `${FIELD_LABELS[c.key] ?? c.key} changed`,
      previousValue: fmt(c.from),
      newValue: fmt(c.to),
      createdAt: now,
    });
  }

  await ctx.db.insert("activities", {
    agencyId,
    candidateId,
    userId: user._id,
    action,
    description: summary,
    createdAt: now,
  });

  return { changed: changes.length, stage: after };
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

export const list = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(candidateStatusValidator),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    let rows = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    if (args.status) rows = rows.filter((c) => c.currentStatus === args.status);
    const q = args.search?.trim().toLowerCase();
    if (q) {
      rows = rows.filter((c) =>
        [c.firstName, c.lastName, c.passportNumber ?? "", c.laborId ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }

    /* enrichment: employer name + open task counts (batched) */
    const jobOrders = await ctx.db
      .query("jobOrders")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const clientName = new Map(clients.map((c) => [c._id, c.name]));
    const orderClient = new Map(jobOrders.map((o) => [o._id, o.clientId]));
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId,
    );
    const openTasks = new Map<Id<"candidates">, number>();
    for (const t of tasks) {
      if (t.status === "completed" || t.status === "cancelled" || !t.relatedCandidateId)
        continue;
      openTasks.set(t.relatedCandidateId, (openTasks.get(t.relatedCandidateId) ?? 0) + 1);
    }

    const out = rows.map((c) => {
      const stage = deriveStage(c).stage;
      let employer: string | null = null;
      if (c.jobOrderId) {
        const cl = orderClient.get(c.jobOrderId);
        if (cl) employer = clientName.get(cl) ?? null;
      }
      return {
        ...c,
        derivedStage: stage,
        department: deriveDepartment(c),
        employerName: employer,
        openTasks: openTasks.get(c._id) ?? 0,
        stageEnteredAt: c.lastStatusChangeAt ?? c._creationTime,
      };
    });

    const filtered = args.stage ? out.filter((c) => c.derivedStage === args.stage) : out;
    filtered.sort(
      (a, b) =>
        (b.lastStatusChangeAt ?? b._creationTime) -
        (a.lastStatusChangeAt ?? a._creationTime),
    );
    return filtered;
  },
});

export const detail = query({
  args: { id: v.id("candidates") },
  handler: async (ctx, { id }) => {
    const { agencyId } = await requireAgency(ctx);
    const candidate = await ctx.db.get(id);
    if (!candidate || candidate.agencyId !== agencyId) return null;

    let employerName: string | null = null;
    if (candidate.jobOrderId) {
      const order = await ctx.db.get(candidate.jobOrderId);
      if (order) {
        const client = await ctx.db.get(order.clientId);
        employerName = client?.name ?? null;
      }
    }

    const staff = await peopleMap(ctx, [
      candidate.assignedStaffId,
      candidate.lastUpdatedBy,
    ]);

    return {
      ...candidate,
      derivedStage: deriveStage(candidate).stage,
      department: deriveDepartment(candidate),
      employerName,
      assignedStaffName: candidate.assignedStaffId
        ? staff[candidate.assignedStaffId]?.name ?? null
        : null,
      lastUpdatedByName: candidate.lastUpdatedBy
        ? staff[candidate.lastUpdatedBy]?.name ?? null
        : null,
      stageEnteredAt: candidate.lastStatusChangeAt ?? candidate._creationTime,
    };
  },
});

/** Everything the candidate detail page needs: progress steps, the audit
 *  trail with staff names, tasks and fees for this file. */
export const timeline = query({
  args: { id: v.id("candidates") },
  handler: async (ctx, { id }) => {
    const { agencyId } = await requireAgency(ctx);
    const candidate = await ctx.db.get(id);
    if (!candidate || candidate.agencyId !== agencyId) return null;

    const stage = deriveStage(candidate).stage as StageName;
    const currentIdx = PIPELINE_STAGES.indexOf(stage);
    const idx = currentIdx === -1 ? 0 : currentIdx;
    const steps = PIPELINE_STAGES.map((name, i) => ({
      id: name,
      name,
      status: i < idx ? ("done" as const) : i === idx ? ("current" as const) : ("upcoming" as const),
    }));

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_candidate", (q) => q.eq("candidateId", id))
      .order("desc")
      .take(40);

    const staff = await peopleMap(ctx, [
      ...activities.map((a) => a.userId),
      candidate.assignedStaffId,
      candidate.lastUpdatedBy,
    ]);

    const tasks = (await ctx.db.query("staffTasks").collect())
      .filter(
        (t) =>
          t.agencyId === agencyId && t.relatedCandidateId === id,
      )
      .sort((a, b) => (a.dueDate ?? a.createdAt) - (b.dueDate ?? b.createdAt));

    const fees = (
      await ctx.db
        .query("fees")
        .withIndex("by_candidate", (q) => q.eq("candidateId", id))
        .collect()
    ).sort((a, b) => b.arrangedAt - a.arrangedAt);

    let employerName: string | null = null;
    if (candidate.jobOrderId) {
      const order = await ctx.db.get(candidate.jobOrderId);
      if (order) {
        const client = await ctx.db.get(order.clientId);
        employerName = client?.name ?? null;
      }
    }

    return {
      candidate: {
        ...candidate,
        derivedStage: stage,
        department: deriveDepartment(candidate),
        employerName,
        stageEnteredAt: candidate.lastStatusChangeAt ?? candidate._creationTime,
      },
      steps,
      activities: activities.map((a) => ({
        _id: a._id,
        action: a.action,
        description: a.description,
        createdAt: a.createdAt,
        actorName: a.userId ? (staff[a.userId]?.name ?? null) : null,
      })),
      assignedStaffName: candidate.assignedStaffId
        ? staff[candidate.assignedStaffId]?.name ?? null
        : null,
      lastUpdatedByName: candidate.lastUpdatedBy
        ? staff[candidate.lastUpdatedBy]?.name ?? null
        : null,
      tasks: tasks.map((t) => ({
        ...t,
        assigneeName: t.userId ? (staff[t.userId]?.name ?? null) : null,
      })),
      fees,
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Mutations                                                                  */
/* -------------------------------------------------------------------------- */

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    passportNumber: v.string(),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    occupation: v.optional(v.string()),
    region: v.optional(v.string()),
    nationality: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    const passport = args.passportNumber.trim().toUpperCase();
    if (!passport) throw new Error("Passport number is required");
    const now = Date.now();
    const id = await ctx.db.insert("candidates", {
      agencyId,
      firstName: args.firstName,
      lastName: args.lastName,
      passportNumber: passport,
      phone: args.phone,
      dateOfBirth: args.dateOfBirth,
      gender: args.gender,
      occupation: args.occupation,
      region: args.region,
      nationality: args.nationality ?? "Ethiopian",
      notes: args.notes,
      currentStatus: "new",
      lastStatusChangeAt: now,
      lastUpdatedBy: user._id,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: id,
      userId: user._id,
      action: "candidate_created",
      description: `File opened for ${args.firstName} ${args.lastName}`,
      createdAt: now,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("candidates"), patch: candidatePatchValidator },
  handler: async (ctx, { id, patch }) => {
    const { agencyId } = await requireAgency(ctx);
    const candidate = await ctx.db.get(id);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const changes: { key: string; from: unknown; to: unknown }[] = [];
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (fmt(candidate[key as keyof Doc<"candidates">]) === fmt(value)) continue;
      changes.push({ key, from: candidate[key as keyof Doc<"candidates">], to: value });
    }
    if (changes.length === 0) return { changed: 0, stage: deriveStage(candidate).stage };
    const summary = `${candidate.firstName} ${candidate.lastName} — ${changes.length} field${
      changes.length > 1 ? "s" : ""
    } updated (${changes.map((c) => FIELD_LABELS[c.key] ?? c.key).join(", ")})`;
    return commitChanges(ctx, id, changes, "candidate_updated", summary);
  },
});

/** One-click "move the file to the next desk": applies the minimal raw-sheet
 *  change that advances the derived stage. */
const ADVANCE: Record<
  string,
  { patch: Record<string, string>; label: string }
> = {
  "New Entry": { patch: { documents: "AVAILABLE" }, label: "Documents collected" },
  Reception: { patch: { musStat: "AVAILABLE" }, label: "Listed on Musaned (open for recruitment)" },
  "Info Desk / Musaned": { patch: { musStat: "EMPLOYEE" }, label: "Employer contract signed (E-PRO)" },
  "Contracted (E-PRO)": { patch: { medical: "IN-PROGRESS" }, label: "Medical slip issued" },
  Medical: { patch: { medical: "FIT" }, label: "Medical examination passed (FIT)" },
  "Ready for Wakalah": { patch: { wakalah: "REQUESTED" }, label: "Sponsorship-transfer fee requested" },
  "Wakalah Pending": { patch: { wakalah: "PAID" }, label: "Sponsorship-transfer fee paid" },
  "Wakalah Paid": { patch: { visaStatus: "PROCESSING" }, label: "Visa application filed" },
  "Visa Processing": { patch: { visaStatus: "VISA ISSUED" }, label: "Visa issued" },
  "Visa Issued": {
    patch: { bookedFor: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) },
    label: "Flight booked",
  },
  "Flight Booked": { patch: { flightStat: "DEPARTED" }, label: "Candidate departed" },
};

export const advanceStage = mutation({
  args: { id: v.id("candidates") },
  handler: async (ctx, { id }) => {
    const { agencyId } = await requireAgency(ctx);
    const candidate = await ctx.db.get(id);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const stage = deriveStage(candidate).stage;
    const step = ADVANCE[stage];
    if (!step) {
      return { advanced: false, stage, message: "This file cannot be advanced further." };
    }
    const changes = Object.entries(step.patch).map(([key, to]) => ({
      key,
      from: candidate[key as keyof Doc<"candidates">],
      to,
    }));
    const stageName = stage as StageName;
    const next = PIPELINE_STAGES[Math.min(PIPELINE_STAGES.indexOf(stageName) + 1, PIPELINE_STAGES.length - 1)];
    const result = await commitChanges(
      ctx,
      id,
      changes,
      "stage_advanced",
      `${step.label} — moved to ${next}`,
    );
    return { advanced: true, stage: result.stage, next };
  },
});
