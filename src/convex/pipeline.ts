import type { Doc } from "./_generated/dataModel";

/* -------------------------------------------------------------------------- */
/* Derived stage detection — the agency's real pipeline rules (strict order)  */
/* -------------------------------------------------------------------------- */

type Pipe = Pick<
  Doc<"candidates">,
  | "musStat"
  | "lmisStat"
  | "medical"
  | "wakalah"
  | "visaStatus"
  | "training"
  | "bookedFor"
  | "flightStat"
  | "documents"
  | "firstName"
  | "passportNumber"
  | "laborId"
  | "contractCreatedAt"
  | "lastStatusChangeAt"
>;

export interface DerivedStage {
  stage: string;
  priority: number;
}

const VISA_IN_FLIGHT = [
  "TASHEER",
  "EMBASSY",
  "RETURNED FROM EMBASSY",
  "EXPIRED",
] as const;
const MUSANED_OPEN = ["AVAILABLE", "PROCESSING", "NEW", "HELD"] as const;

/** Terminal / exit states win over everything. */
export function isExited(c: Pipe): boolean {
  return (
    c.musStat === "DELETED" ||
    c.musStat === "CONTRACT CANCELED" ||
    c.flightStat === "CANCELED" ||
    c.visaStatus === "VISA CANCELED" ||
    c.documents === "WITHDRAWN"
  );
}

export function deriveStage(c: Pipe): DerivedStage {
  if (isExited(c)) return { stage: "Exited", priority: -1 };
  if (c.flightStat === "DEPARTED") return { stage: "Departed", priority: 9 };
  if (c.bookedFor) return { stage: "Flight Booked", priority: 8 };
  if (c.visaStatus === "VISA ISSUED") return { stage: "Visa Issued", priority: 7 };
  if (c.visaStatus && (VISA_IN_FLIGHT as readonly string[]).includes(c.visaStatus)) {
    return { stage: "Visa Processing", priority: 6 };
  }
  const contracted = c.musStat === "EMPLOYEE";
  if (contracted && c.medical === "FIT" && c.wakalah === "PAID") {
    return { stage: "Wakalah Paid", priority: 5 };
  }
  if (contracted && c.medical === "FIT" && c.wakalah === "REQUESTED") {
    return { stage: "Wakalah Pending", priority: 4 };
  }
  if (contracted && c.medical === "FIT") {
    return { stage: "Ready for Wakalah", priority: 4 };
  }
  if (c.medical || c.documents === "TAKEN FOR MEDICAL") {
    return { stage: "Medical", priority: 3 };
  }
  if (contracted) return { stage: "Contracted (E-PRO)", priority: 2 };
  if (c.musStat && (MUSANED_OPEN as readonly string[]).includes(c.musStat)) {
    return { stage: "Info Desk / Musaned", priority: 2 };
  }
  if (c.documents === "AVAILABLE" && c.firstName && c.passportNumber) {
    return { stage: "Reception", priority: 1 };
  }
  return { stage: "New Entry", priority: 0 };
}

/* -------------------------------------------------------------------------- */
/* Department ownership                                                       */
/* -------------------------------------------------------------------------- */

export function deriveDepartment(c: Pipe): string {
  if (isExited(c) || c.flightStat === "DEPARTED") return "Completed";
  if (c.wakalah || c.visaStatus || c.training || c.bookedFor) {
    return "Document Control";
  }
  if (c.musStat === "EMPLOYEE" && (c.lmisStat || c.laborId)) return "Data Entry";
  if (c.musStat === "EMPLOYEE") return "Data Entry (E-PRO)";
  if (c.musStat || c.medical || c.documents === "TAKEN FOR MEDICAL") {
    return "Info Desk";
  }
  if (c.documents === "AVAILABLE" && c.firstName) return "Reception";
  return "Pre-Registration";
}

/* -------------------------------------------------------------------------- */
/* Stuck detection (post-contract only) + deployment timer                    */
/* -------------------------------------------------------------------------- */

export const STUCK_THRESHOLDS: Record<string, { days: number; owner: string }> = {
  Medical: { days: 7, owner: "Info Desk" },
  "Ready for Wakalah": { days: 3, owner: "Info Desk → PRO" },
  "Wakalah Pending": { days: 3, owner: "Info Desk → PRO" },
  "Wakalah Paid": { days: 3, owner: "Data Entry (E-PRO, LMIS)" },
  "Visa Processing": { days: 14, owner: "Document Control" },
  "Visa Issued": { days: 14, owner: "Document Control" },
  "Flight Booked": { days: 3, owner: "Document Control" },
};

export interface StuckInfo {
  daysInStage: number;
  threshold: number | null;
  owner: string | null;
  stuck: boolean;
}

/** Days spent in the current derived stage, compared against the threshold. */
export function stuckInfo(c: Pipe, now = Date.now()): StuckInfo {
  const stage = deriveStage(c).stage;
  const t = STUCK_THRESHOLDS[stage];
  const anchor = c.lastStatusChangeAt ?? c.contractCreatedAt ?? now;
  const daysInStage = Math.max(0, Math.floor((now - anchor) / 86_400_000));
  if (!t || daysInStage < t.days) {
    return { daysInStage, threshold: t?.days ?? null, owner: t?.owner ?? null, stuck: false };
  }
  return { daysInStage, threshold: t.days, owner: t.owner, stuck: true };
}

export const DEPLOYMENT_TIMER = {
  warnDays: 20,
  criticalDays: 25,
  overdueDays: 30,
} as const;

/** Contract → departure timer. Returns null pre-contract. */
export function deploymentTimer(
  c: Pipe,
  now = Date.now(),
): { days: number; level: "warn" | "critical" | "overdue" | "clear" } | null {
  if (!c.contractCreatedAt) return null;
  const days = Math.max(0, Math.floor((now - c.contractCreatedAt) / 86_400_000));
  if (days >= DEPLOYMENT_TIMER.overdueDays) return { days, level: "overdue" };
  if (days >= DEPLOYMENT_TIMER.criticalDays) return { days, level: "critical" };
  if (days >= DEPLOYMENT_TIMER.warnDays) return { days, level: "warn" };
  return { days, level: "clear" };
}

/* -------------------------------------------------------------------------- */
/* Derived stage → 13-value currentStatus sync                                */
/* -------------------------------------------------------------------------- */

import type { CandidateStatus } from "./schema";

const STAGE_TO_STATUS: Record<string, CandidateStatus> = {
  "New Entry": "new",
  Reception: "documentation",
  "Info Desk / Musaned": "documentation",
  "Contracted (E-PRO)": "contracting",
  Medical: "medical_check",
  "Ready for Wakalah": "medical_check",
  "Wakalah Pending": "contracting",
  "Wakalah Paid": "contracting",
  "Visa Processing": "visa_processing",
  "Visa Issued": "ready_for_departure",
  "Flight Booked": "ready_for_departure",
  Departed: "deployed",
  Exited: "rejected",
};

export function statusFromPipeline(c: Pipe): CandidateStatus {
  return STAGE_TO_STATUS[deriveStage(c).stage] ?? "on_hold";
}

export const PIPELINE_STAGES = [
  "New Entry",
  "Reception",
  "Info Desk / Musaned",
  "Contracted (E-PRO)",
  "Medical",
  "Ready for Wakalah",
  "Wakalah Pending",
  "Wakalah Paid",
  "Visa Processing",
  "Visa Issued",
  "Flight Booked",
  "Departed",
  "Exited",
] as const;
