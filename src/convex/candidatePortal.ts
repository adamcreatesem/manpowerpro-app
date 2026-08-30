import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deriveDepartment, deriveStage, stuckInfo } from "./pipeline";

/** Candidate portal login — passport number + 6-digit PIN. No user row. */
export const login = mutation({
  args: { passportNumber: v.string(), pin: v.string() },
  handler: async (ctx, { passportNumber, pin }) => {
    const passport = passportNumber.trim().toUpperCase();
    const candidate = await ctx.db
      .query("candidates")
      .withIndex("by_passport", (q) => q.eq("passportNumber", passport))
      .first();
    if (!candidate) throw new Error("No file found for this passport number");
    if (!candidate.portalPin || candidate.portalPin !== pin.trim()) {
      throw new Error("Incorrect PIN");
    }
    return {
      candidateId: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      currentStatus: candidate.currentStatus,
    };
  },
});

/** Public-facing status for the candidate portal (no sensitive fields). */
export const status = query({
  args: { candidateId: v.id("candidates") },
  handler: async (ctx, { candidateId }) => {
    const candidate = await ctx.db.get(candidateId);
    if (!candidate) return null;
    const stage = deriveStage(candidate);
    return {
      candidateId: candidate._id,
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      passportNumber: candidate.passportNumber,
      currentStatus: candidate.currentStatus,
      derivedStage: stage.stage,
      department: deriveDepartment(candidate),
      musStat: candidate.musStat ?? null,
      medical: candidate.medical ?? null,
      wakalah: candidate.wakalah ?? null,
      visaStatus: candidate.visaStatus ?? null,
      training: candidate.training ?? null,
      bookedFor: candidate.bookedFor ?? null,
      flightStat: candidate.flightStat ?? null,
      pro: candidate.pro ?? null,
      stuck: stuckInfo(candidate),
    };
  },
});
