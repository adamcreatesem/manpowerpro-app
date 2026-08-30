import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  departmentValidator,
  staffTaskStatusValidator,
  taskPriorityValidator,
} from "./schema";
import { peopleMap, requireAgency } from "./helpers";
import type { Id } from "./_generated/dataModel";

/** The office task list — each desk's daily record, joined with candidate and
 *  assignee names. */
export const list = query({
  args: { status: v.optional(staffTaskStatusValidator) },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    let rows = (await ctx.db.query("staffTasks").collect()).filter(
      (t) => t.agencyId === agencyId,
    );
    if (args.status) rows = rows.filter((t) => t.status === args.status);
    rows.sort(
      (a, b) => (a.dueDate ?? a.createdAt) - (b.dueDate ?? b.createdAt) || b.createdAt - a.createdAt,
    );

    const staff = await peopleMap(ctx, rows.map((t) => t.userId));
    const candidateIds = [
      ...new Set(rows.map((t) => t.relatedCandidateId).filter((x): x is Id<"candidates"> => !!x)),
    ];
    const candidates = await Promise.all(candidateIds.map((cid) => ctx.db.get(cid)));
    const candidateName = new Map(
      candidates
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => [c._id, `${c.firstName} ${c.lastName}`]),
    );

    return rows.map((t) => ({
      ...t,
      assigneeName: t.userId ? (staff[t.userId]?.name ?? null) : null,
      candidateName: t.relatedCandidateId
        ? (candidateName.get(t.relatedCandidateId) ?? null)
        : null,
    }));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    department: departmentValidator,
    description: v.optional(v.string()),
    priority: v.optional(taskPriorityValidator),
    relatedCandidateId: v.optional(v.id("candidates")),
    dueDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    if (!args.title.trim()) throw new Error("Task title is required");
    const now = Date.now();
    const id = await ctx.db.insert("staffTasks", {
      agencyId,
      userId: user._id,
      department: args.department,
      title: args.title.trim(),
      description: args.description,
      priority: args.priority,
      status: "pending",
      relatedCandidateId: args.relatedCandidateId,
      dueDate: args.dueDate,
      createdAt: now,
    });
    if (args.relatedCandidateId) {
      await ctx.db.insert("activities", {
        agencyId,
        candidateId: args.relatedCandidateId,
        userId: user._id,
        action: "task_created",
        description: `Task created: ${args.title.trim()}`,
        createdAt: now,
      });
    }
    return id;
  },
});

export const setStatus = mutation({
  args: { id: v.id("staffTasks"), status: staffTaskStatusValidator },
  handler: async (ctx, { id, status }) => {
    const { agencyId, user } = await requireAgency(ctx);
    const task = await ctx.db.get(id);
    if (!task || task.agencyId !== agencyId) throw new Error("Task not found");
    await ctx.db.patch(id, {
      status,
      completedAt: status === "completed" ? Date.now() : undefined,
    });
    if (status === "completed" && task.relatedCandidateId) {
      await ctx.db.insert("activities", {
        agencyId,
        candidateId: task.relatedCandidateId,
        userId: user._id,
        action: "task_completed",
        description: `Task completed: ${task.title}`,
        createdAt: Date.now(),
      });
    }
  },
});
