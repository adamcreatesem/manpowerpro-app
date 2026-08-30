import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAgency } from "./helpers";
import type { Id } from "./_generated/dataModel";

const MONTH = 30 * 24 * 60 * 60 * 1000;

/* -------------------------------------------------------------------------- */
/* Desk query — everything the communications page needs in one subscription. */
/* -------------------------------------------------------------------------- */

export const desk = query({
  args: {},
  handler: async (ctx) => {
    const { agencyId, user } = await requireAgency(ctx);

    const templates = (
      await ctx.db.query("communicationTemplates").collect()
    ).filter((t) => t.agencyId === agencyId && t.isActive);
    templates.sort((a, b) => b.createdAt - a.createdAt);

    const logs = (await ctx.db.query("communicationLogs").collect()).filter(
      (l) => l.agencyId === agencyId,
    );
    logs.sort((a, b) => b.sentAt - a.sentAt);

    const candidates = await ctx.db
      .query("candidates")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
      .collect();
    const staff = (await ctx.db.query("users").collect()).filter(
      (u) => u.agencyId === agencyId && u.role !== "client",
    );

    /* inbound queue: unread messages sent by clients or candidates */
    const clientMsgs = (
      await ctx.db.query("clientMessages").collect()
    ).filter((m) => m.agencyId === agencyId && !m.readByAgency);
    clientMsgs.sort((a, b) => b.createdAt - a.createdAt);

    const candidateMsgs = (
      await ctx.db.query("candidateMessages").collect()
    ).filter((m) => m.agencyId === agencyId && !m.readByAgency);
    candidateMsgs.sort((a, b) => b.createdAt - a.createdAt);

    const clientName = new Map(clients.map((c) => [c._id, c.name]));
    const candidateName = new Map(
      candidates.map((c) => [
        c._id,
        [c.firstName, c.lastName].filter(Boolean).join(" "),
      ]),
    );

    const inbound = [
      ...clientMsgs.slice(0, 8).map((m) => ({
        kind: "client" as const,
        id: m._id,
        fromName: clientName.get(m.clientId) ?? "Employer",
        body: m.body,
        createdAt: m.createdAt,
      })),
      ...candidateMsgs.slice(0, 8).map((m) => ({
        kind: "candidate" as const,
        id: m._id,
        fromName: candidateName.get(m.candidateId) ?? "Candidate",
        body: m.body,
        createdAt: m.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt);

    const monthStart = Date.now() - MONTH;
    const sentThisMonth = logs.filter((l) => l.sentAt >= monthStart);

    return {
      templates: templates.map((t) => ({
        _id: t._id,
        name: t.name,
        channel: t.channel,
        type: t.type,
        subject: t.subject ?? null,
        body: t.body,
      })),
      logs: logs.slice(0, 40).map((l) => ({
        _id: l._id,
        channel: l.channel,
        recipientType: l.recipientType,
        recipientCount: l.recipientCount,
        subject: l.subject ?? null,
        body: l.body,
        status: l.status,
        sentAt: l.sentAt,
      })),
      inbound,
      recipients: {
        candidates: candidates.map((c) => ({
          _id: c._id,
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || "Candidate",
        })),
        clients: clients.map((c) => ({ _id: c._id, name: c.name })),
      },
      summary: {
        sentThisMonth: sentThisMonth.length,
        recipientsThisMonth: sentThisMonth.reduce(
          (n, l) => n + l.recipientCount,
          0,
        ),
        templates: templates.length,
        pendingReplies: inbound.length,
        allCandidatesCount: candidates.length,
        staffCount: staff.length,
      },
      viewer: { userId: user._id },
    };
  },
});

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

export const createTemplate = mutation({
  args: {
    name: v.string(),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("telegram"),
      v.literal("in_app"),
    ),
    type: v.union(
      v.literal("status_update"),
      v.literal("reminder"),
      v.literal("announcement"),
      v.literal("custom"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    if (!args.name.trim()) throw new Error("Template name is required");
    if (!args.body.trim()) throw new Error("Template body is required");

    const id = await ctx.db.insert("communicationTemplates", {
      agencyId,
      name: args.name.trim(),
      channel: args.channel,
      type: args.type,
      subject: args.subject,
      body: args.body,
      createdAt: Date.now(),
      createdBy: user._id,
      isActive: true,
    });
    return id;
  },
});

/* -------------------------------------------------------------------------- */
/* Send                                                                       */
/* -------------------------------------------------------------------------- */

export const send = mutation({
  args: {
    templateId: v.optional(v.id("communicationTemplates")),
    channel: v.union(
      v.literal("email"),
      v.literal("sms"),
      v.literal("telegram"),
      v.literal("in_app"),
    ),
    recipientType: v.union(
      v.literal("candidate"),
      v.literal("client"),
      v.literal("staff"),
      v.literal("all_candidates"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    candidateId: v.optional(v.id("candidates")),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const { agencyId, user } = await requireAgency(ctx);
    if (!args.body.trim()) throw new Error("Message body is required");
    const body = args.body.trim();
    const subject = args.subject?.trim() || undefined;
    const now = Date.now();

    let recipientCount = 1;
    if (args.recipientType === "all_candidates") {
      recipientCount = await ctx.db
        .query("candidates")
        .withIndex("by_agency", (q) => q.eq("agencyId", agencyId))
        .collect()
        .then((rows) => rows.length);
    } else if (args.recipientType === "staff") {
      recipientCount = (
        await ctx.db.query("users").collect()
      ).filter((u) => u.agencyId === agencyId && u.role !== "client").length;
    }

    /* validate single recipients belong to this office */
    if (args.recipientType === "candidate") {
      if (!args.candidateId) throw new Error("Pick a candidate");
      const c = await ctx.db.get(args.candidateId);
      if (!c || c.agencyId !== agencyId) throw new Error("Candidate not found");
    }
    if (args.recipientType === "client") {
      if (!args.clientId) throw new Error("Pick an employer");
      const c = await ctx.db.get(args.clientId);
      if (!c || c.agencyId !== agencyId) throw new Error("Employer not found");
    }

    const logId = await ctx.db.insert("communicationLogs", {
      agencyId,
      templateId: args.templateId,
      channel: args.channel,
      recipientType: args.recipientType,
      recipientCount,
      subject,
      body,
      status: "sent",
      sentAt: now,
      sentBy: user._id,
    });

    /* single-recipient sends also land in the message thread so the portal /
       employer side can pick them up later */
    if (args.recipientType === "candidate" && args.candidateId) {
      await ctx.db.insert("candidateMessages", {
        agencyId,
        candidateId: args.candidateId,
        senderRole: "agency",
        senderId: user._id,
        body,
        readByCandidate: false,
        readByAgency: true,
        createdAt: now,
      });
    }
    if (args.recipientType === "client" && args.clientId) {
      await ctx.db.insert("clientMessages", {
        agencyId,
        clientId: args.clientId,
        senderRole: "agency",
        senderId: user._id,
        body,
        readByClient: false,
        readByAgency: true,
        createdAt: now,
      });
    }

    await ctx.db.insert("activities", {
      agencyId,
      userId: user._id,
      action: "communication_sent",
      description: `${args.channel} → ${args.recipientType} (${recipientCount}${
        recipientCount > 1 ? " recipients" : ""
      }): ${subject ?? body.slice(0, 60)}`,
      createdAt: now,
    });

    return { id: logId, recipientCount };
  },
});

/* -------------------------------------------------------------------------- */
/* Inbound — mark a portal message as seen by the office                       */
/* -------------------------------------------------------------------------- */

export const markInboundRead = mutation({
  args: {
    kind: v.union(v.literal("client"), v.literal("candidate")),
    id: v.union(v.id("clientMessages"), v.id("candidateMessages")),
  },
  handler: async (ctx, args) => {
    const { agencyId } = await requireAgency(ctx);
    const row = await ctx.db.get(args.id);
    if (!row || row.agencyId !== agencyId) throw new Error("Message not found");
    await ctx.db.patch(args.id, { readByAgency: true });
  },
});

/* -------------------------------------------------------------------------- */
/* Type helper for the client                                                  */
/* -------------------------------------------------------------------------- */

export type DeskResult = {
  templates: {
    _id: Id<"communicationTemplates">;
    name: string;
    channel: "email" | "sms" | "telegram" | "in_app";
    type: "status_update" | "reminder" | "announcement" | "custom";
    subject: string | null;
    body: string;
  }[];
  logs: {
    _id: Id<"communicationLogs">;
    channel: "email" | "sms" | "telegram" | "in_app";
    recipientType: "candidate" | "client" | "staff" | "all_candidates";
    recipientCount: number;
    subject: string | null;
    body: string;
    status: "sent" | "failed" | "partial";
    sentAt: number;
  }[];
  inbound: {
    kind: "client" | "candidate";
    id: Id<"clientMessages"> | Id<"candidateMessages">;
    fromName: string;
    body: string;
    createdAt: number;
  }[];
  recipients: {
    candidates: { _id: Id<"candidates">; name: string }[];
    clients: { _id: Id<"clients">; name: string }[];
  };
  summary: {
    sentThisMonth: number;
    recipientsThisMonth: number;
    templates: number;
    pendingReplies: number;
    allCandidatesCount: number;
    staffCount: number;
  };
  viewer: { userId: Id<"users"> };
};
