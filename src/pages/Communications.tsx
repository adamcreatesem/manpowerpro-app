import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCheck,
  FileText,
  Inbox,
  Loader2,
  Mail,
  MessageSquareText,
  Plus,
  Send,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { relativeTime } from "@/lib/format";

const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  telegram: "Telegram",
  in_app: "In-app",
};

const RECIPIENT_LABELS: Record<string, string> = {
  candidate: "One candidate",
  client: "One employer",
  staff: "Office staff",
  all_candidates: "All candidates",
};

const TYPE_LABELS: Record<string, string> = {
  status_update: "Status update",
  reminder: "Reminder",
  announcement: "Announcement",
  custom: "Custom",
};

const COMPOSE_INITIAL = {
  channel: "email" as "email" | "sms" | "telegram" | "in_app",
  recipientType: "candidate" as
    | "candidate"
    | "client"
    | "staff"
    | "all_candidates",
  candidateId: "",
  clientId: "",
  templateId: "",
  subject: "",
  body: "",
};

const TEMPLATE_INITIAL = {
  name: "",
  channel: "email" as "email" | "sms" | "telegram" | "in_app",
  type: "status_update" as
    | "status_update"
    | "reminder"
    | "announcement"
    | "custom",
  subject: "",
  body: "",
};

export default function Communications() {
  const data = useQuery(api.communications.desk);
  const send = useMutation(api.communications.send);
  const createTemplate = useMutation(api.communications.createTemplate);
  const markInboundRead = useMutation(api.communications.markInboundRead);

  const [compose, setCompose] = useState(COMPOSE_INITIAL);
  const [sending, setSending] = useState(false);

  const [tplOpen, setTplOpen] = useState(false);
  const [tplBusy, setTplBusy] = useState(false);
  const [tpl, setTpl] = useState(TEMPLATE_INITIAL);

  const summary = data?.summary;
  const candidate = data?.recipients.candidates.find(
    (c) => c._id === compose.candidateId,
  );
  const client = data?.recipients.clients.find(
    (c) => c._id === compose.clientId,
  );

  const recipientTargetLabel =
    compose.recipientType === "candidate"
      ? candidate?.name ?? "Pick a candidate"
      : compose.recipientType === "client"
        ? client?.name ?? "Pick an employer"
        : compose.recipientType === "staff"
          ? `${summary?.staffCount ?? 0} office staff`
          : `${summary?.allCandidatesCount ?? 0} candidates`;

  const handleSend = async () => {
    if (!compose.body.trim()) {
      toast("Message body is required");
      return;
    }
    if (compose.recipientType === "candidate" && !compose.candidateId) {
      toast("Pick a candidate");
      return;
    }
    if (compose.recipientType === "client" && !compose.clientId) {
      toast("Pick an employer");
      return;
    }
    setSending(true);
    try {
      const result = await send({
        templateId: (compose.templateId || undefined) as
          | Id<"communicationTemplates">
          | undefined,
        channel: compose.channel,
        recipientType: compose.recipientType,
        subject: compose.subject || undefined,
        body: compose.body.trim(),
        candidateId: (compose.candidateId || undefined) as
          | Id<"candidates">
          | undefined,
        clientId: (compose.clientId || undefined) as
          | Id<"clients">
          | undefined,
      });
      setCompose({
        ...COMPOSE_INITIAL,
        channel: compose.channel,
        recipientType: compose.recipientType,
      });
      toast("Message sent", {
        description: `Delivered to ${recipientTargetLabel}${
          result.recipientCount > 1 ? ` (${result.recipientCount})` : ""
        }`,
      });
    } catch (err) {
      toast("Could not send message", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tpl.name.trim() || !tpl.body.trim()) {
      toast("Template name and body are required");
      return;
    }
    setTplBusy(true);
    try {
      await createTemplate({
        name: tpl.name.trim(),
        channel: tpl.channel,
        type: tpl.type,
        subject: tpl.subject.trim() || undefined,
        body: tpl.body.trim(),
      });
      setTplOpen(false);
      setTpl(TEMPLATE_INITIAL);
      toast("Template saved");
    } catch (err) {
      toast("Could not save template", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setTplBusy(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Communications</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Status updates & outreach
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep candidates and Saudi employers informed as files move through
          the pipeline — with every send logged for the office.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Send className="size-3.5" /> Sent this month
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.sentThisMonth : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary ? `${summary.recipientsThisMonth} recipients` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3.5" /> Templates
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.templates : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Saved drafts</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Inbox className="size-3.5" /> Pending replies
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.pendingReplies : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Unread inbound</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <MessageSquareText className="size-3.5" /> Channels
          </p>
          <p className="font-display mt-1 text-2xl">4</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Email · SMS · Telegram · In-app
          </p>
        </div>
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            {/* ------------------------------------------------------------ */}
            {/* Compose                                                        */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-lg border border-border/80 p-5">
              <p className="text-label">Compose</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                New message
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Channel</Label>
                  <Select
                    value={compose.channel}
                    onValueChange={(value) =>
                      setCompose({
                        ...compose,
                        channel: value as typeof compose.channel,
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Recipients</Label>
                  <Select
                    value={compose.recipientType}
                    onValueChange={(value) =>
                      setCompose({
                        ...compose,
                        recipientType: value as typeof compose.recipientType,
                        candidateId: "",
                        clientId: "",
                      })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECIPIENT_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {compose.recipientType === "candidate" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Candidate</Label>
                    <Select
                      value={compose.candidateId}
                      onValueChange={(value) =>
                        setCompose({ ...compose, candidateId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a candidate…" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.recipients.candidates.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {compose.recipientType === "client" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Employer</Label>
                    <Select
                      value={compose.clientId}
                      onValueChange={(value) =>
                        setCompose({ ...compose, clientId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an employer…" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.recipients.clients.map((c) => (
                          <SelectItem key={c._id} value={c._id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {data.templates.length > 0 && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Start from template</Label>
                    <Select
                      value={compose.templateId}
                      onValueChange={(value) => {
                        const t = data.templates.find(
                          (x) => x._id === value,
                        );
                        setCompose({
                          ...compose,
                          templateId: value,
                          subject: t?.subject ?? compose.subject,
                          body: t?.body ?? compose.body,
                        });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a template…" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.templates.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-subject">Subject</Label>
                  <Input
                    id="c-subject"
                    value={compose.subject}
                    onChange={(e) =>
                      setCompose({ ...compose, subject: e.target.value })
                    }
                    placeholder="Optional for SMS / in-app"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="c-body">Message</Label>
                  <Textarea
                    id="c-body"
                    rows={5}
                    value={compose.body}
                    onChange={(e) =>
                      setCompose({ ...compose, body: e.target.value })
                    }
                    placeholder="Dear {name}, your visa has been issued…"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted-foreground">
                  To:{" "}
                  <span className="font-medium text-foreground">
                    {recipientTargetLabel}
                  </span>
                </p>
                <Button onClick={handleSend} disabled={sending}>
                  {sending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 size-4" />
                  )}
                  Send message
                </Button>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Recent sends                                                   */}
            {/* ------------------------------------------------------------ */}
            <div className="rounded-lg border border-border/80 p-5">
              <p className="text-label">Log</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                Recent sends
              </h2>

              {data.logs.length === 0 ? (
                <div className="mt-6 text-center">
                  <Mail className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Nothing sent yet</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    The first message you send appears here with its recipient
                    count.
                  </p>
                </div>
              ) : (
                <div className="mt-4 divide-y divide-border/50">
                  {data.logs.map((l) => (
                    <div key={l._id} className="py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {CHANNEL_LABELS[l.channel] ?? l.channel}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(l.sentAt)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {RECIPIENT_LABELS[l.recipientType] ??
                            l.recipientType}{" "}
                          · {l.recipientCount}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13px] font-medium">
                        {l.subject || "No subject"}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {l.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* Inbound                                                        */}
          {/* ------------------------------------------------------------ */}
          <div className="rounded-lg border border-border/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-label">Inbound</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  Needs a reply
                </h2>
              </div>
              <Badge variant="outline">
                {data.inbound.length} unread
              </Badge>
            </div>

            {data.inbound.length === 0 ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCheck className="size-4" />
                Inbox clear — no unread messages from candidates or employers.
              </p>
            ) : (
              <div className="mt-4 divide-y divide-border/50">
                {data.inbound.map((m) => (
                  <div
                    key={`${m.kind}-${m.id}`}
                    className="flex items-start justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">
                        {m.fromName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {m.kind === "client" ? "Employer" : "Candidate"} ·{" "}
                          {relativeTime(m.createdAt)}
                        </span>
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                        {m.body}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={async () => {
                        try {
                          await markInboundRead({ kind: m.kind, id: m.id });
                        } catch (err) {
                          toast("Could not mark as read", {
                            description:
                              err instanceof Error
                                ? err.message
                                : "Unknown error",
                          });
                        }
                      }}
                    >
                      <CheckCheck className="mr-1.5 size-3.5" />
                      Mark read
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------ */}
          {/* Templates                                                      */}
          {/* ------------------------------------------------------------ */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-label">Templates</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  Saved messages
                </h2>
              </div>
              <Button variant="outline" onClick={() => setTplOpen(true)}>
                <Plus className="mr-2 size-4" />
                New template
              </Button>
            </div>

            {data.templates.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-12 text-center">
                <FileText className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No templates yet</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Save a reusable message so the next status update takes one
                  click.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.templates.map((t) => (
                  <div
                    key={t._id}
                    className="rounded-md border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold tracking-tight">
                        {t.name}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline">
                          {CHANNEL_LABELS[t.channel] ?? t.channel}
                        </Badge>
                        <Badge variant="outline">
                          {TYPE_LABELS[t.type] ?? t.type}
                        </Badge>
                      </div>
                    </div>
                    {t.subject && (
                      <p className="mt-2 text-xs font-medium">{t.subject}</p>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {t.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* New template dialog                                             */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New template</DialogTitle>
            <DialogDescription>
              A reusable message for the desk. Use {"{name}"} for the
              recipient's name.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTemplate} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-name">Template name</Label>
              <Input
                id="t-name"
                value={tpl.name}
                onChange={(e) => setTpl({ ...tpl, name: e.target.value })}
                required
                placeholder="Visa issued — candidate update"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select
                  value={tpl.channel}
                  onValueChange={(value) =>
                    setTpl({ ...tpl, channel: value as typeof tpl.channel })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={tpl.type}
                  onValueChange={(value) =>
                    setTpl({ ...tpl, type: value as typeof tpl.type })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-subject">Subject</Label>
              <Input
                id="t-subject"
                value={tpl.subject}
                onChange={(e) => setTpl({ ...tpl, subject: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-body">Body</Label>
              <Textarea
                id="t-body"
                rows={4}
                value={tpl.body}
                onChange={(e) => setTpl({ ...tpl, body: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setTplOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={tplBusy}>
                {tplBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
