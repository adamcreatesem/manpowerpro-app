import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAgency, requireRole } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel";

const DAY = 24 * 60 * 60 * 1000;

const officeRoleValidator = v.union(
  v.literal("agency_owner"),
  v.literal("agency_manager"),
  v.literal("agency_staff"),
);

/**
 * Office administration: the agency's regulatory identity (license, MOLS
 * registration), its subscription/plan with live usage against limits, and
 * the team of staff accounts attached to the office.
 */
export const profile = query({
  args: {},
  handler: async (ctx) => {
    const { user, agencyId } = await requireAgency(ctx);
    const agency = await ctx.db.get(agencyId);
    if (!agency) throw new Error("Agency record not found");

    /* subscription → plan */
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .order("desc")
      .first();
    const plan = subscription ? await ctx.db.get(subscription.planId) : null;

    /* usage against plan limits */
    const members = await ctx.db
      .query("users")
      .withIndex("agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const staff = members.filter((m) => m.role !== "client");
    const activeStaff = staff.filter((m) => m.isActive !== false);
    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();

    const daysUntilLicenseExpiry = agency.licenseExpiry
      ? Math.ceil(
          (new Date(`${agency.licenseExpiry}T00:00:00`).getTime() - Date.now()) /
            DAY,
        )
      : null;

    return {
      agency: {
        _id: agency._id,
        name: agency.name,
        code: agency.code,
        address: agency.address ?? null,
        phone: agency.phone ?? null,
        website: agency.website ?? null,
        contactEmail: agency.contactEmail ?? null,
        licenseNumber: agency.licenseNumber ?? null,
        licenseExpiry: agency.licenseExpiry ?? null,
        daysUntilLicenseExpiry,
        bankGuarantee: agency.bankGuarantee ?? null,
        molsRegistrationNumber: agency.molsRegistrationNumber ?? null,
        molsRegistrationDate: agency.molsRegistrationDate ?? null,
      },
      viewer: {
        userId: user._id,
        role: user.role ?? null,
      },
      subscription: subscription
        ? {
            _id: subscription._id,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd ?? null,
            seatCount: subscription.seatCount ?? null,
            plan: plan
              ? {
                  _id: plan._id,
                  tier: plan.tier,
                  name: plan.name,
                  description: plan.description,
                  priceMonthly: plan.priceMonthly,
                  maxStaff: plan.maxStaff,
                  maxCandidates: plan.maxCandidates,
                  maxClients: plan.maxClients,
                }
              : null,
          }
        : null,
      usage: {
        staff: activeStaff.length,
        staffTotal: staff.length,
        candidates: candidates.length,
        clients: clients.length,
      },
    };
  },
});

/** Updates the agency's profile. Owner/manager only; every change is logged. */
export const updateAgency = mutation({
  args: {
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    licenseExpiry: v.optional(v.string()),
    bankGuarantee: v.optional(v.string()),
    molsRegistrationNumber: v.optional(v.string()),
    molsRegistrationDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "super_admin",
      "agency_owner",
      "agency_manager",
    ]);
    if (!user.agencyId) throw new Error("No agency attached to this account");

    const patch: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined && value.trim() !== "") patch[key] = value.trim();
    }
    if (Object.keys(patch).length === 0) return;

    await ctx.db.patch(user.agencyId, patch);
    await ctx.db.insert("activities", {
      agencyId: user.agencyId,
      userId: user._id,
      action: "agency_updated",
      description: `Updated office profile (${Object.keys(patch).join(", ")})`,
      createdAt: Date.now(),
    });
  },
});

/** The office team: members with live workload derived from their files. */
export const team = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId } = await requireAgency(ctx);

    const members = await ctx.db
      .query("users")
      .withIndex("agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const staff = members
      .filter((m) => m.role !== "client")
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const tasks = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId,
    );

    const assignedById: Record<string, number> = {};
    const deployedById: Record<string, number> = {};
    for (const c of candidates) {
      if (!c.assignedStaffId) continue;
      const key = c.assignedStaffId;
      assignedById[key] = (assignedById[key] ?? 0) + 1;
      if (c.flightStat === "DEPARTED") deployedById[key] = (deployedById[key] ?? 0) + 1;
    }

    const actionsById: Record<string, number> = {};
    for (const a of activities) {
      if (!a.userId) continue;
      actionsById[a.userId] = (actionsById[a.userId] ?? 0) + 1;
    }

    const openTasksById: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "completed" || t.status === "cancelled") continue;
      openTasksById[t.userId] = (openTasksById[t.userId] ?? 0) + 1;
    }

    return {
      rows: staff.map((m) => ({
        userId: m._id,
        name: m.name ?? "Unnamed",
        email: m.email ?? null,
        role: m.role ?? "agency_staff",
        isActive: m.isActive !== false,
        staffRole: m.staffRole ?? null,
        assigned: assignedById[m._id] ?? 0,
        deployed: deployedById[m._id] ?? 0,
        actions: actionsById[m._id] ?? 0,
        openTasks: openTasksById[m._id] ?? 0,
      })),
    };
  },
});

/** Adds a staff account to the office. Owner/manager only. */
export const addTeamMember = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: officeRoleValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "super_admin",
      "agency_owner",
      "agency_manager",
    ]);
    if (!user.agencyId) throw new Error("No agency attached to this account");

    const email = args.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required");
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");

    const existing = await ctx.db
      .query("users")
      .withIndex("agency", (q) => q.eq("agencyId", user.agencyId as Id<"agencies">))
      .collect();
    if (existing.some((m) => m.email?.toLowerCase() === email)) {
      throw new Error("A member with this email already belongs to the office");
    }

    const memberId = await ctx.db.insert("users", {
      name,
      email,
      role: args.role,
      agencyId: user.agencyId,
      isActive: true,
    });
    await ctx.db.insert("activities", {
      agencyId: user.agencyId,
      userId: user._id,
      action: "team_added",
      description: `Added ${name} (${args.role.replace("agency_", "")}) to the team`,
      createdAt: Date.now(),
    });
    return memberId;
  },
});

/** Updates a team member's role or active status. Owner/manager only. */
export const updateTeamMember = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    role: v.optional(officeRoleValidator),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "super_admin",
      "agency_owner",
      "agency_manager",
    ]);
    if (!user.agencyId) throw new Error("No agency attached to this account");

    const target = await ctx.db.get(args.userId);
    if (!target || target.agencyId !== user.agencyId) {
      throw new Error("Member not found in this office");
    }

    /* can't deactivate your own account from the settings page */
    if (args.isActive === false && args.userId === user._id) {
      throw new Error("You cannot deactivate your own account");
    }

    /* never leave the office without an active owner */
    if (
      (args.isActive === false || (args.role && args.role !== "agency_owner")) &&
      target.role === "agency_owner"
    ) {
      const members = await ctx.db
        .query("users")
        .withIndex("agency", (q) => q.eq("agencyId", user.agencyId as Id<"agencies">))
        .collect();
      const otherOwners = members.filter(
        (m) =>
          m.role === "agency_owner" &&
          m.isActive !== false &&
          m._id !== args.userId,
      );
      if (otherOwners.length === 0) {
        throw new Error("Office must keep at least one active owner");
      }
    }

    const patch: Partial<Doc<"users">> = {};
    if (args.name !== undefined) patch.name = args.name.trim() || target.name;
    if (args.role !== undefined) patch.role = args.role;
    if (args.isActive !== undefined) patch.isActive = args.isActive;
    await ctx.db.patch(args.userId, patch);

    await ctx.db.insert("activities", {
      agencyId: user.agencyId,
      userId: user._id,
      action: "team_updated",
      description: `Updated ${target.name ?? "team member"} (${Object.keys(patch).join(", ")})`,
      createdAt: Date.now(),
    });
  },
});
