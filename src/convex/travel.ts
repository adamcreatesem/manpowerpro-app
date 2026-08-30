import { v } from "convex/values";
import {
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { biometricStatusValidator, visaAppStatusValidator } from "./schema";
import { requireAgency } from "./helpers";
import {
  deriveStage,
  isExited,
  statusFromPipeline,
  stuckInfo,
} from "./pipeline";
import type { Doc, Id } from "./_generated/dataModel";

const DAY = 86_400_000;
/** Visas expiring within this many days show as "expiring" on the desk. */
const VISA_EXPIRY_WINDOW = 30;

/* The sheet's visa statuses, in filing order — powers the quick actions. */
const NEXT_VISA_STEP: Record<string, { next: string; label: string }> = {
  PROCESSING: { next: "TASHEER", label: "Tasheer appointment" },
  TASHEER: { next: "EMBASSY", label: "Submit to embassy" },
  EMBASSY: { next: "RETURNED FROM EMBASSY", label: "Returned from embassy" },
  "RETURNED FROM EMBASSY": { next: "VISA ISSUED", label: "Mark visa issued" },
};

const IN_FLIGHT = ["TASHEER", "EMBASSY", "RETURNED FROM EMBASSY"] as const;
const CLOSED = ["REJECTED", "VISA CANCELED", "REQUEST CANCELATION"] as const;

const isoDate = (ts: number) => new Date(ts).toISOString().slice(0, 10);
const parseDate = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const ts = new Date(`${s}T00:00:00`).getTime();
  return Number.isFinite(ts) ? ts : null;
};

function deskPriority(visaStatus: string | undefined): number {
  if (!visaStatus) return 9;
  if ((IN_FLIGHT as readonly string[]).includes(visaStatus)) return 0;
  if (visaStatus === "PROCESSING") return 1;
  if (visaStatus === "VISA ISSUED") return 2;
  if ((CLOSED as readonly string[]).includes(visaStatus)) return 3;
  return 4;
}

/** Fetches the caller's agency + a candidate that belongs to it. */
async function requireCandidate(ctx: MutationCtx, id: Id<"candidates">) {
  const { agencyId, user } = await requireAgency(ctx);
  const candidate = await ctx.db.get(id);
  if (!candidate || candidate.agencyId !== agencyId) {
    throw new Error("Candidate not found");
  }
  return { agencyId, user, candidate };
}

/* -------------------------------------------------------------------------- */
/* Visa desk — every file in the visa stages, with its application record     */
/* -------------------------------------------------------------------------- */

export const visaDesk = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);
    const now = Date.now();

    const candidates = (await ctx.db.query("candidates").collect()).filter(
      (c) => c.agencyId === agencyId,
    );
    const apps = await ctx.db.query("visaApplications").collect();
    const appsByCandidate = new Map<Id<"candidates">, Doc<"visaApplications">[]>();
    for (const a of apps) {
      const arr = appsByCandidate.get(a.candidateId) ?? [];
      arr.push(a);
      appsByCandidate.set(a.candidateId, arr);
    }

    const rows = candidates
      .filter((c) => c.visaStatus && !isExited(c))
      .map((c) => {
        const list = appsByCandidate.get(c._id) ?? [];
        const app =
          [...list].sort(
            (a, b) =>
              (b.applicationDate ?? b._creationTime) -
              (a.applicationDate ?? a._creationTime),
          )[0] ?? null;
        const stuck = stuckInfo(c, now);
        const step = c.visaStatus ? NEXT_VISA_STEP[c.visaStatus] : undefined;
        let expiring = false;
        if (c.visaStatus === "VISA ISSUED") {
          const expTs = parseDate(app?.expiryDate);
          expiring =
            expTs !== null && expTs - now <= VISA_EXPIRY_WINDOW * DAY;
        }
        return {
          _id: c._id,
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? "",
          passportNumber: c.passportNumber,
          occupation: c.occupation,
          pro: c.pro,
          visaStatus: c.visaStatus,
          tasheerAppointmentDate: c.tasheerAppointmentDate,
          derivedStage: deriveStage(c).stage,
          daysInStage: stuck.daysInStage,
          stuck: stuck.stuck,
          stuckOwner: stuck.owner,
          app,
          nextStep: step ? { next: step.next, label: step.label } : null,
          expiring,
        };
      });

    rows.sort(
      (a, b) =>
        deskPriority(a.visaStatus) - deskPriority(b.visaStatus) ||
        (b.daysInStage - a.daysInStage),
    );

    const summary = {
      total: rows.length,
      inFlight: rows.filter((r) =>
        (IN_FLIGHT as readonly string[]).includes(r.visaStatus as string),
      ).length,
      processing: rows.filter((r) => r.visaStatus === "PROCESSING").length,
      issued: rows.filter((r) => r.visaStatus === "VISA ISSUED").length,
      expiring: rows.filter((r) => r.expiring).length,
      closed: rows.filter((r) =>
        (CLOSED as readonly string[]).includes(r.visaStatus as string),
      ).length,
      withApp: rows.filter((r) => r.app).length,
    };

    return { rows, summary };
  },
});

/* -------------------------------------------------------------------------- */
/* Travel & training desk — flights, training certs, gaps before departure    */
/* -------------------------------------------------------------------------- */

export const travelDesk = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);

    const candidates = (await ctx.db.query("candidates").collect()).filter(
      (c) => c.agencyId === agencyId,
    );
    const byId = new Map(candidates.map((c) => [c._id, c]));
    const nameOf = (c: Doc<"candidates">) =>
      `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();

    const departures = (await ctx.db.query("departures").collect())
      .filter((d) => d.agencyId === agencyId)
      .map((d) => {
        const c = byId.get(d.candidateId);
        return {
          _id: d._id,
          candidateId: d.candidateId,
          candidateName: c ? nameOf(c) : "Unknown",
          passportNumber: c?.passportNumber,
          occupation: c?.occupation,
          pro: c?.pro,
          flightNumber: d.flightNumber,
          departureDate: d.departureDate,
          destination: d.destination,
          status: d.status,
        };
      })
      .sort((a, b) => (a.departureDate ?? 0) - (b.departureDate ?? 0));

    const training = (await ctx.db.query("trainingCertifications").collect())
      .map((t) => {
        const c = byId.get(t.candidateId);
        return {
          _id: t._id,
          candidateId: t.candidateId,
          candidateName: c ? nameOf(c) : "Unknown",
          passportNumber: c?.passportNumber,
          courseName: t.courseName,
          centerName: t.centerName,
          startDate: t.startDate,
          endDate: t.endDate,
          totalHours: t.totalHours,
          status: t.status,
          certificateNumber: t.certificateNumber,
          certificateIssueDate: t.certificateIssueDate,
        };
      })
      .sort((a, b) => (a.endDate ?? "").localeCompare(b.endDate ?? ""));

    /* Gap rows: issued visa but no booking yet. */
    const apps = await ctx.db.query("visaApplications").collect();
    const needsFlight = candidates
      .filter(
        (c) =>
          c.visaStatus === "VISA ISSUED" &&
          !c.bookedFor &&
          c.flightStat !== "DEPARTED" &&
          !isExited(c),
      )
      .map((c) => {
        const app = apps.find(
          (a) => a.candidateId === c._id && a.status === "issued",
        );
        return {
          _id: c._id,
          firstName: c.firstName ?? "",
          lastName: c.lastName ?? "",
          passportNumber: c.passportNumber,
          occupation: c.occupation,
          pro: c.pro,
          visaNumber: app?.visaNumber ?? null,
        };
      });

    /* Gap rows: flight booked but training not passed. */
    const needsTraining = candidates
      .filter(
        (c) =>
          (c.bookedFor || c.flightStat === "BOOKED") &&
          c.training !== "PASS" &&
          c.flightStat !== "DEPARTED" &&
          !isExited(c),
      )
      .map((c) => ({
        _id: c._id,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        passportNumber: c.passportNumber,
        occupation: c.occupation,
        bookedFor: c.bookedFor,
        training: c.training,
      }));

    const departed = candidates.filter(
      (c) => c.flightStat === "DEPARTED" || c.flightStat === "ARRIVED",
    );

    const summary = {
      flightsBooked: departures.filter((d) => d.status !== "departed").length,
      departed: departed.length,
      trainingPassed: training.filter((t) => t.status === "passed").length,
      trainingPending: needsTraining.length,
      needsFlight: needsFlight.length,
    };

    return { departures, training, needsFlight, needsTraining, summary };
  },
});

/* -------------------------------------------------------------------------- */
/* Mutations — each writes an activity so the file's audit trail stays whole  */
/* -------------------------------------------------------------------------- */

/** Upsert the visa application record for one file. */
export const saveVisaApp = mutation({
  args: {
    candidateId: v.id("candidates"),
    status: v.optional(visaAppStatusValidator),
    mofaRefNumber: v.optional(v.string()),
    biometricStatus: v.optional(biometricStatusValidator),
    tasheerAppointmentId: v.optional(v.string()),
    visaNumber: v.optional(v.string()),
    visaIssueDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    embassyName: v.optional(v.string()),
    embassyReference: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user, candidate } = await requireCandidate(
      ctx,
      args.candidateId,
    );
    const now = Date.now();
    const existing = await ctx.db
      .query("visaApplications")
      .filter((q) => q.eq(q.field("candidateId"), args.candidateId))
      .first();

    const clean = Object.fromEntries(
      Object.entries(args).filter(
        ([k, value]) => k !== "candidateId" && value !== undefined,
      ),
    ) as Partial<Doc<"visaApplications">>;

    if (existing) {
      await ctx.db.patch(existing._id, clean);
    } else {
      await ctx.db.insert("visaApplications", {
        candidateId: args.candidateId,
        country: "Saudi Arabia",
        visaType: "Employment",
        status: "submitted",
        applicationDate: now,
        ...clean,
      });
    }
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "visa_app_updated",
      description: `Visa application record updated for ${candidate.firstName} ${candidate.lastName}`,
      createdAt: now,
    });
  },
});

/** Record (or update) a flight — also moves the candidate's sheet forward. */
export const saveDeparture = mutation({
  args: {
    candidateId: v.id("candidates"),
    flightNumber: v.optional(v.string()),
    departureDate: v.optional(v.number()),
    destination: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("confirmed"),
      v.literal("departed"),
    ),
  },
  handler: async (ctx, args) => {
    const { agencyId, user, candidate } = await requireCandidate(
      ctx,
      args.candidateId,
    );
    const now = Date.now();
    const existing = await ctx.db
      .query("departures")
      .withIndex("by_candidate", (q) => q.eq("candidateId", args.candidateId))
      .first();

    const { status, ...rest } = args;
    const clean = Object.fromEntries(
      Object.entries(rest).filter(([, value]) => value !== undefined),
    ) as Partial<Doc<"departures">>;

    if (existing) {
      await ctx.db.patch(existing._id, { ...clean, status });
    } else {
      await ctx.db.insert("departures", {
        agencyId,
        candidateId: args.candidateId,
        status,
        ...clean,
      });
    }

    /* Keep the sheet in sync: booking moves the file to Flight Booked,
       departing moves it to Departed. */
    const patch: Record<string, unknown> = {};
    if (args.status === "departed") {
      if (candidate.flightStat !== "DEPARTED") {
        patch.flightStat = "DEPARTED";
        patch.deployedAt = now;
      }
    } else {
      if (!candidate.bookedFor && args.departureDate) {
        patch.bookedFor = isoDate(args.departureDate);
      }
      if (!candidate.flightStat || candidate.flightStat === "PENDING") {
        patch.flightStat = "BOOKED";
      }
    }
    if (Object.keys(patch).length > 0) {
      const merged = { ...candidate, ...patch };
      await ctx.db.patch(args.candidateId, {
        ...patch,
        currentStatus: statusFromPipeline(merged),
        lastUpdatedBy: user._id,
        lastStatusChangeAt: now,
      });
    }

    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "flight_recorded",
      description:
        args.status === "departed"
          ? `${candidate.firstName} ${candidate.lastName} departed — ${args.flightNumber ?? "flight"}`
          : `Flight ${args.flightNumber ?? ""} booked for ${candidate.firstName} ${candidate.lastName}`,
      createdAt: now,
    });
  },
});

/** Record (or update) a training certification — syncs the sheet column. */
export const saveTraining = mutation({
  args: {
    candidateId: v.id("candidates"),
    courseName: v.optional(v.string()),
    centerName: v.optional(v.string()),
    trainerName: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    totalHours: v.optional(v.number()),
    certificateNumber: v.optional(v.string()),
    certificateIssueDate: v.optional(v.string()),
    status: v.union(
      v.literal("attended"),
      v.literal("passed"),
      v.literal("failed"),
      v.literal("retest"),
    ),
  },
  handler: async (ctx, args) => {
    const { agencyId, user, candidate } = await requireCandidate(
      ctx,
      args.candidateId,
    );
    const now = Date.now();
    const existing = await ctx.db
      .query("trainingCertifications")
      .filter((q) => q.eq(q.field("candidateId"), args.candidateId))
      .first();

    const clean = Object.fromEntries(
      Object.entries(args).filter(
        ([k, value]) => k !== "candidateId" && value !== undefined,
      ),
    ) as Partial<Doc<"trainingCertifications">>;

    if (existing) {
      await ctx.db.patch(existing._id, clean);
    } else {
      await ctx.db.insert("trainingCertifications", {
        candidateId: args.candidateId,
        ...clean,
        createdAt: now,
      });
    }

    const SHEET: Record<
      "attended" | "passed" | "failed" | "retest",
      "ATTENDED" | "PASS" | "FAIL" | "RETEST"
    > = {
      attended: "ATTENDED",
      passed: "PASS",
      failed: "FAIL",
      retest: "RETEST",
    };
    if (candidate.training !== SHEET[args.status]) {
      await ctx.db.patch(args.candidateId, {
        training: SHEET[args.status],
        lastUpdatedBy: user._id,
        lastStatusChangeAt: now,
      });
    }

    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "training_recorded",
      description: `Training recorded for ${candidate.firstName} ${candidate.lastName} — ${args.status}${args.courseName ? ` (${args.courseName})` : ""}`,
      createdAt: now,
    });
  },
});
