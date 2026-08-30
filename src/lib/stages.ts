/* The agency's real pipeline — derived from the raw sheet columns, in strict
   order, mirroring src/convex/pipeline.ts on the server. */

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

export type Stage = (typeof PIPELINE_STAGES)[number];

export interface StageMeta {
  id: Stage;
  desk: string; // which desk owns the file at this point
  blurb: string;
}

export const STAGE_META: Record<Stage, StageMeta> = {
  "New Entry": {
    id: "New Entry",
    desk: "Reception",
    blurb: "Personal details taken, documents being collected.",
  },
  Reception: {
    id: "Reception",
    desk: "Reception",
    blurb: "Documents on file — passport, photos, certificates.",
  },
  "Info Desk / Musaned": {
    id: "Info Desk / Musaned",
    desk: "Info Desk",
    blurb: "Registered on E-LMIS and listed on Musaned, open for recruitment.",
  },
  "Contracted (E-PRO)": {
    id: "Contracted (E-PRO)",
    desk: "Info Desk → Data Entry",
    blurb: "Saudi employer signed the contract (E-PRO). Medical next.",
  },
  Medical: {
    id: "Medical",
    desk: "Info Desk",
    blurb: "Medical slip issued; examination at an approved clinic pending.",
  },
  "Ready for Wakalah": {
    id: "Ready for Wakalah",
    desk: "Info Desk → PRO",
    blurb: "Medical FIT. Sponsorship-transfer fee being arranged.",
  },
  "Wakalah Pending": {
    id: "Wakalah Pending",
    desk: "Info Desk → PRO",
    blurb: "Sponsorship-transfer fee requested, awaiting payment.",
  },
  "Wakalah Paid": {
    id: "Wakalah Paid",
    desk: "Data Entry",
    blurb: "Fee paid. Visa application is the next step.",
  },
  "Visa Processing": {
    id: "Visa Processing",
    desk: "Document Control",
    blurb: "Visa filed — Tasheer biometrics, embassy follow-up.",
  },
  "Visa Issued": {
    id: "Visa Issued",
    desk: "Document Control",
    blurb: "Visa in hand. Training and flight booking.",
  },
  "Flight Booked": {
    id: "Flight Booked",
    desk: "Document Control",
    blurb: "Pre-departure training done, flight confirmed.",
  },
  Departed: {
    id: "Departed",
    desk: "After-care",
    blurb: "Candidate departed. Post-arrival tracking continues.",
  },
  Exited: {
    id: "Exited",
    desk: "—",
    blurb: "File closed — cancelled, withdrawn or deleted.",
  },
};

export function stageIndex(stage: string): number {
  const i = (PIPELINE_STAGES as readonly string[]).indexOf(stage);
  return Math.max(0, i);
}

export function nextStage(stage: string): Stage | null {
  const i = stageIndex(stage);
  if (i >= PIPELINE_STAGES.length - 1) return null;
  return PIPELINE_STAGES[i + 1];
}

/* Department filter options for the pipeline board */
export const DEPARTMENTS = [
  "Reception",
  "Info Desk",
  "Data Entry",
  "Document Control",
  "After-care",
] as const;
