import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { documentStatusValidator } from "./schema";
import { requireAgency } from "./helpers";
import { deriveStage } from "./pipeline";

/* -------------------------------------------------------------------------- */
/* Document checklist — the file's papers, mirroring what the office collects  */
/* -------------------------------------------------------------------------- */

export const DOCUMENT_TYPES = [
  { key: "passport", label: "Passport", requiredForEntry: true },
  { key: "photos", label: "Passport photos", requiredForEntry: true },
  { key: "certificates", label: "Certificates & education", requiredForEntry: true },
  { key: "admission", label: "Admission form & declaration", requiredForEntry: true },
  { key: "medical", label: "Medical exam slip", requiredForEntry: false },
  { key: "contract", label: "Contract (E-PRO)", requiredForEntry: false },
  { key: "wakalah", label: "Wakalah receipt", requiredForEntry: false },
  { key: "visa", label: "Visa & tasheer documents", requiredForEntry: false },
  { key: "training", label: "Training certificate", requiredForEntry: false },
  { key: "ticket", label: "Flight ticket", requiredForEntry: false },
] as const;

/** All documents on file for the agency, newest first. */
export const list = query({
  args: { candidateId: v.optional(v.id("candidates")) },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    let rows = await ctx.db.query("documents").collect();
    rows = rows.filter((d) => d.agencyId === agencyId);
    if (args.candidateId) rows = rows.filter((d) => d.candidateId === args.candidateId);
    rows.sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
    return rows;
  },
});

/** Create or update a document row (used to log a paper, mark verified, etc.). */
export const upsert = mutation({
  args: {
    id: v.optional(v.id("documents")),
    candidateId: v.id("candidates"),
    type: v.string(),
    name: v.string(),
    status: documentStatusValidator,
    fileUrl: v.optional(v.string()),
    externalRef: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    const candidate = await ctx.db.get(args.candidateId);
    if (!candidate || candidate.agencyId !== agencyId) {
      throw new Error("Candidate not found");
    }
    const now = Date.now();
    if (args.id) {
      const existing = await ctx.db.get(args.id);
      if (!existing || existing.agencyId !== agencyId) {
        throw new Error("Document not found");
      }
      await ctx.db.patch(args.id, {
        type: args.type,
        name: args.name,
        status: args.status,
        ...(args.fileUrl !== undefined ? { fileUrl: args.fileUrl } : {}),
        ...(args.externalRef !== undefined ? { externalRef: args.externalRef } : {}),
      });
      await ctx.db.insert("activities", {
        agencyId,
        candidateId: args.candidateId,
        userId: user._id,
        action: "document_updated",
        description: `Document updated: ${args.name} → ${args.status}`,
        createdAt: now,
      });
      return args.id;
    }
    const id = await ctx.db.insert("documents", {
      agencyId,
      candidateId: args.candidateId,
      name: args.name,
      type: args.type,
      fileUrl: args.fileUrl,
      status: args.status,
      uploadedBy: user._id,
      externalRef: args.externalRef,
    });
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: args.candidateId,
      userId: user._id,
      action: "document_added",
      description: `Document logged: ${args.name} (${args.status})`,
      createdAt: now,
    });
    return id;
  },
});

/** Remove a document row from the file. */
export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, { id }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.agencyId !== agencyId) {
      throw new Error("Document not found");
    }
    await ctx.db.delete(id);
    await ctx.db.insert("activities", {
      agencyId,
      candidateId: doc.candidateId,
      userId: user._id,
      action: "document_removed",
      description: `Document removed: ${doc.name}`,
      createdAt: Date.now(),
    });
  },
});

/* -------------------------------------------------------------------------- */
/* Readiness gate — the per-file checklist the office checks before pushing    */
/* -------------------------------------------------------------------------- */

export const readiness = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);

    const candidates = (await ctx.db.query("candidates").collect()).filter(
      (c) => c.agencyId === agencyId,
    );
    const allDocs = (await ctx.db.query("documents").collect()).filter(
      (d) => d.agencyId === agencyId,
    );

    const docsByCandidate = new Map<string, typeof allDocs>();
    for (const d of allDocs) {
      if (!d.candidateId) continue;
      const list = docsByCandidate.get(d.candidateId) ?? [];
      list.push(d);
      docsByCandidate.set(d.candidateId, list);
    }

    const hintFor = (c: (typeof candidates)[number], key: string): string | undefined => {
      switch (key) {
        case "passport":
          return c.passportNumber ? `Passport ${c.passportNumber} on record` : undefined;
        case "medical":
          return c.medical ? `Medical: ${c.medical}` : undefined;
        case "contract":
          return c.contractCreatedAt || c.pro ? `Contract / E-PRO via ${c.pro ?? "—"}` : undefined;
        case "wakalah":
          return c.wakalah ? `Wakalah: ${c.wakalah}` : undefined;
        case "visa":
          return c.visaStatus ? `Visa: ${c.visaStatus}` : undefined;
        case "training":
          return c.training ? `Training: ${c.training}` : undefined;
        case "ticket":
          return c.flightStat || c.bookedFor
            ? `Flight: ${c.flightStat ?? `booked ${c.bookedFor}`}`
            : undefined;
        default:
          return undefined;
      }
    };

    const rows = candidates.map((c) => {
      const docs = docsByCandidate.get(c._id) ?? [];
      const items = DOCUMENT_TYPES.map((t) => {
        const doc = docs.find((d) => d.type === t.key);
        const status = doc ? doc.status : "pending";
        return {
          key: t.key,
          label: t.label,
          requiredForEntry: t.requiredForEntry,
          status,
          docId: doc ? doc._id : null,
          hint: hintFor(c, t.key),
        };
      });
      const collected = items.filter(
        (i) => i.status === "verified" || i.status === "uploaded",
      ).length;
      const coreCollected = items.filter(
        (i) => i.requiredForEntry && (i.status === "verified" || i.status === "uploaded"),
      ).length;
      const coreTotal = items.filter((i) => i.requiredForEntry).length;
      const stage = deriveStage(c).stage;
      return {
        _id: c._id,
        firstName: c.firstName ?? "",
        lastName: c.lastName ?? "",
        passportNumber: c.passportNumber ?? null,
        stage,
        items,
        collected,
        total: items.length,
        coreCollected,
        coreTotal,
        readyToProcess: coreCollected === coreTotal,
      };
    });

    rows.sort((a, b) => {
      if (a.readyToProcess !== b.readyToProcess) return a.readyToProcess ? 1 : -1;
      return (a.firstName + a.lastName).localeCompare(b.firstName + b.lastName);
    });

    const exited = rows.filter((r) => r.stage === "Exited").length;
    const ready = rows.filter((r) => r.readyToProcess && r.stage !== "Exited").length;

    return {
      candidates: rows,
      summary: {
        total: rows.length,
        ready,
        notReady: rows.length - ready - exited,
        exited,
      },
    };
  },
});
