import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PIPELINE_STAGES, STAGE_META, nextStage } from "@/lib/stages";
import { daysInStage, fmtDate, fmtDateTime, initials, money, relativeTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDashed,
  Clock,
  History,
  ListChecks,
  Loader2,
  Pencil,
  Plus,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

const DEPARTMENTS = [
  { value: "reception", label: "Reception" },
  { value: "info_desk", label: "Info Desk" },
  { value: "data_entry", label: "Data Entry" },
  { value: "document_control", label: "Document Control" },
] as const;

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

/* Editable raw sheet fields, grouped for the edit dialog */
const TEXT_FIELDS: { key: string; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "nationality", label: "Nationality" },
  { key: "gender", label: "Gender" },
  { key: "occupation", label: "Occupation" },
  { key: "region", label: "Region" },
  { key: "pro", label: "PRO" },
  { key: "laborId", label: "Labor ID" },
  { key: "musanedId", label: "Musaned ID" },
  { key: "wafidRefNumber", label: "Wafid reference" },
  { key: "medicalExpiryDate", label: "Medical expiry" },
  { key: "tasheerAppointmentDate", label: "Tasheer appointment" },
  { key: "bookedFor", label: "Booked for" },
  { key: "notes", label: "Notes" },
];

const SELECT_FIELDS: { key: string; label: string; options: string[] }[] = [
  { key: "documents", label: "Documents", options: ["AVAILABLE", "WITHDRAWN", "TAKEN FOR MEDICAL"] },
  { key: "musStat", label: "Musaned", options: ["NEW", "AVAILABLE", "PROCESSING", "EMPLOYEE", "HELD", "DELETED", "CONTRACT CANCELED", "REQUEST CANCELATION"] },
  { key: "lmisStat", label: "LMIS", options: ["IMPORTED", "ISSUED", "OFFLINE", "PMNT PAID", "HELD", "DELETED"] },
  { key: "medical", label: "Medical", options: ["IN-PROGRESS", "SLIP ISSUED", "TAKEN SLIP", "FIT", "UNFIT", "EXPIRED"] },
  { key: "wakalah", label: "Wakalah", options: ["REQUESTED", "PAID"] },
  { key: "visaStatus", label: "Visa", options: ["PROCESSING", "TASHEER", "EMBASSY", "RETURNED FROM EMBASSY", "VISA ISSUED", "EXPIRED", "REJECTED", "REQUEST CANCELATION", "VISA CANCELED"] },
  { key: "training", label: "Training", options: ["ATTENDED", "PASS", "FAIL", "RETEST"] },
  { key: "flightStat", label: "Flight", options: ["PENDING", "BOOKED", "DEPARTED", "DELAYED", "CANCELED", "ARRIVED"] },
];

const DEPARTMENT_LABEL: Record<string, string> = {
  reception: "Reception",
  info_desk: "Info Desk",
  data_entry: "Data Entry",
  document_control: "Document Control",
};

function StatusDot({ status }: { status: "done" | "current" | "upcoming" }) {
  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
        <Check className="size-3" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full border-2 border-foreground">
        <span className="size-1.5 rounded-full bg-foreground" />
      </span>
    );
  }
  return (
    <span className="flex size-5 items-center justify-center rounded-full border border-border">
      <CircleDashed className="size-3 text-muted-foreground/60" />
    </span>
  );
}

export default function CandidateDetail() {
  const { id } = useParams();
  const [advancing, setAdvancing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [feeDialog, setFeeDialog] = useState(false);

  const data = useQuery(api.candidates.timeline, { id: id as Id<"candidates"> });
  const advance = useMutation(api.candidates.advanceStage);
  const update = useMutation(api.candidates.update);
  const createTask = useMutation(api.tasks.create);
  const setTaskStatus = useMutation(api.tasks.setStatus);
  const createFee = useMutation(api.fees.create);
  const markPaid = useMutation(api.fees.markPaid);

  if (!id) return null;

  const handleAdvance = async () => {
    if (!data) return;
    setAdvancing(true);
    try {
      const res = await advance({ id: id as Id<"candidates"> });
      if (res.advanced) {
        toast("File moved", { description: `${data.candidate.firstName} ${data.candidate.lastName} → ${res.next}` });
      } else {
        toast(res.message ?? "Cannot advance further");
      }
    } catch (err) {
      toast("Could not advance", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setAdvancing(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Candidate not found.</p>
          <Link to="/app/candidates" className="mt-2 inline-block text-sm underline underline-offset-2">
            Back to candidates
          </Link>
        </div>
      </div>
    );
  }

  const c = data.candidate;
  const meta = STAGE_META[c.derivedStage as keyof typeof STAGE_META] ?? STAGE_META["New Entry"];
  const next = nextStage(c.derivedStage);
  const stageIdx = Math.max(0, (PIPELINE_STAGES as readonly string[]).indexOf(c.derivedStage));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <Link
          to="/app/candidates"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Candidates
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-[13px] font-medium">
              {initials(`${c.firstName} ${c.lastName}`)}
            </div>
            <div>
              <h1 className="font-display text-3xl font-normal tracking-tight">
                {c.firstName} {c.lastName}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
                <span className="tabular">{c.passportNumber ?? "No passport"}</span>
                <span>·</span>
                <span>{c.occupation ?? "—"}</span>
                <span>·</span>
                <span>{c.region ?? "—"}</span>
                {c.employerName && (
                  <>
                    <span>·</span>
                    <span className="text-foreground">{c.employerName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 size-3.5" /> Edit
            </Button>
            {next && (
              <Button onClick={handleAdvance} disabled={advancing}>
                {advancing ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <ArrowRight className="mr-2 size-3.5" />}
                Move to {next}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Steps tracker — completed steps stay visible */}
      <Card className="border border-border/80 shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label">Progress</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="font-normal">
                {c.derivedStage}
              </Badge>
              <span>Desk: {meta.desk}</span>
              <span className="tabular">
                {daysInStage(c.stageEnteredAt)}d in stage
              </span>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto pb-1">
            <ol className="flex min-w-max items-start gap-0">
              {PIPELINE_STAGES.map((stage, i) => {
                const status = i < stageIdx ? "done" : i === stageIdx ? "current" : "upcoming";
                return (
                  <li key={stage} className="flex items-start">
                    <div className="flex w-24 flex-col items-center gap-1.5 text-center">
                      <StatusDot status={status} />
                      <span
                        className={`text-[10.5px] leading-tight ${
                          status === "upcoming" ? "text-muted-foreground/60" : "text-foreground"
                        }`}
                      >
                        {stage}
                      </span>
                    </div>
                    {i < PIPELINE_STAGES.length - 1 && (
                      <div
                        className={`mt-2.5 h-px w-6 shrink-0 ${
                          i < stageIdx ? "bg-foreground" : "bg-border"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: sheet values + audit trail */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="border border-border/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-[15px] font-semibold tracking-tight">
                Pipeline sheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {TEXT_FIELDS.filter((f) => f.key !== "notes").map((f) => (
                  <div key={f.key} className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-2">
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="truncate text-right text-[13px] font-medium">
                      {(c as unknown as Record<string, unknown>)[f.key] ? String((c as unknown as Record<string, unknown>)[f.key]) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {c.notes && (
                <p className="mt-4 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
                  {c.notes}
                </p>
              )}
              <p className="mt-4 text-[11px] text-muted-foreground">
                Last updated by {data.lastUpdatedByName ?? "—"} · {relativeTime(c.stageEnteredAt)}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                <History className="size-4 text-muted-foreground" />
                Activity — who did what
              </CardTitle>
              <span className="text-[11px] text-muted-foreground">
                {data.activities.length} entries
              </span>
            </CardHeader>
            <CardContent>
              {data.activities.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">
                  Nothing recorded yet. Edits and stage moves will appear here
                  with the staff member's name.
                </p>
              ) : (
                <ol className="space-y-0">
                  {data.activities.map((a, i) => (
                    <li key={a._id} className="relative flex gap-3 pb-5 last:pb-0">
                      {i < data.activities.length - 1 && (
                        <span className="absolute left-[7px] top-4 h-full w-px bg-border" />
                      )}
                      <span className="mt-1.5 size-[15px] shrink-0 rounded-full border border-border bg-background" />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-snug text-foreground">{a.description}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {a.actorName ?? "Agency staff"} · {fmtDateTime(a.createdAt)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: tasks + fees */}
        <div className="space-y-6">
          <Card className="border border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                <ListChecks className="size-4 text-muted-foreground" />
                Tasks
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setTaskDialog(true)}>
                <Plus className="mr-1 size-3.5" /> New
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.tasks.length === 0 && (
                <p className="text-[13px] text-muted-foreground">No tasks on this file.</p>
              )}
              {data.tasks.map((t) => (
                <div
                  key={t._id}
                  className="rounded-md border border-border/70 p-3 transition-colors hover:border-border"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium leading-snug">{t.title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {DEPARTMENT_LABEL[t.department] ?? t.department} ·{" "}
                        {t.dueDate ? relativeTime(t.dueDate) : "No due date"}
                        {t.assigneeName ? ` · ${t.assigneeName}` : ""}
                      </p>
                    </div>
                    {t.status !== "completed" ? (
                      <button
                        type="button"
                        onClick={() => setTaskStatus({ id: t._id, status: "completed" })}
                        className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
                      >
                        Complete
                      </button>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                        <Check className="size-3" /> Done
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-none">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
                <Wallet className="size-4 text-muted-foreground" />
                Fees
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setFeeDialog(true)}>
                <Plus className="mr-1 size-3.5" /> Record
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.fees.length === 0 && (
                <p className="text-[13px] text-muted-foreground">No fees recorded.</p>
              )}
              {data.fees.map((f) => (
                <div
                  key={f._id}
                  className="rounded-md border border-border/70 p-3 transition-colors hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium tabular">{money(f.amount, f.currency)}</p>
                    {f.status === "paid" ? (
                      <Badge variant="outline" className="font-normal">Paid</Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markPaid({ id: f._id })}
                        className="rounded-md border border-border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-accent"
                      >
                        Mark paid
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Arranged {fmtDate(f.arrangedAt)}
                    {f.dueAt ? ` · due ${fmtDate(f.dueAt)}` : ""}
                    {f.paidAt ? ` · paid ${fmtDate(f.paidAt)}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit dialog */}
      <EditDialog
        open={editing}
        onOpenChange={setEditing}
        initial={c}
        onSave={async (patch) => {
          await update({ id: id as Id<"candidates">, patch });
          toast("Saved", { description: "Changes recorded to the audit trail." });
        }}
      />

      {/* New task dialog */}
      <TaskDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        candidateId={id as Id<"candidates">}
        onCreate={async (input) => {
          await createTask({ ...input, relatedCandidateId: id as Id<"candidates"> });
          toast("Task created");
        }}
      />

      {/* Record fee dialog */}
      <FeeDialog
        open={feeDialog}
        onOpenChange={setFeeDialog}
        candidateId={id as Id<"candidates">}
        onCreate={async (input) => {
          await createFee(input);
          toast("Fee recorded");
        }}
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit dialog — raw sheet fields with the audit trail on save                */
/* -------------------------------------------------------------------------- */

type SheetValue = Record<string, unknown>;

function EditDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: SheetValue;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /* sync local state whenever the dialog opens */
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    const next: Record<string, string> = {};
    for (const f of [...TEXT_FIELDS, ...SELECT_FIELDS]) {
      const v = initial[f.key];
      next[f.key] = v === null || v === undefined ? "" : String(v);
    }
    setValues(next);
    setWasOpen(true);
  }
  if (!open && wasOpen) setWasOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const patch: Record<string, unknown> = {};
      for (const f of [...TEXT_FIELDS, ...SELECT_FIELDS]) {
        const raw = values[f.key]?.trim() ?? "";
        if (raw === "" && (initial[f.key] === null || initial[f.key] === undefined)) continue;
        patch[f.key] = raw === "" ? undefined : raw;
      }
      await onSave(patch);
      onOpenChange(false);
    } catch (err) {
      toast("Could not save", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit file</DialogTitle>
          <DialogDescription>
            Changes are saved to the sheet and recorded in the audit trail with
            your name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TEXT_FIELDS.map((f) =>
              f.key === "notes" ? null : (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    value={values[f.key] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ),
            )}
          </div>
          {SELECT_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs">{f.label}</Label>
              <Select
                value={values[f.key] ?? ""}
                onValueChange={(val) => setValues((v) => ({ ...v, [f.key]: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={values["notes"] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Check className="mr-2 size-3.5" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* New task dialog                                                            */
/* -------------------------------------------------------------------------- */

function TaskDialog({
  open,
  onOpenChange,
  candidateId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: Id<"candidates">;
  onCreate: (input: {
    title: string;
    department: "reception" | "info_desk" | "data_entry" | "document_control";
    priority?: "low" | "medium" | "high" | "urgent";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>("info_desk");
  const [priority, setPriority] = useState<string>("medium");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        department: department as "reception" | "info_desk" | "data_entry" | "document_control",
        priority: priority as "low" | "medium" | "high" | "urgent",
      });
      setTitle("");
      onOpenChange(false);
    } catch (err) {
      toast("Could not create task", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Add a task for this candidate's file.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chase wakalah payment" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desk</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Plus className="mr-2 size-3.5" />}
              Create task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Record fee dialog                                                          */
/* -------------------------------------------------------------------------- */

function FeeDialog({
  open,
  onOpenChange,
  candidateId,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: Id<"candidates">;
  onCreate: (input: { candidateId: Id<"candidates">; amount: number; currency: "ETB" | "SAR" | "USD"; notes?: string }) => Promise<void>;
}) {
  const [amount, setAmount] = useState("6500");
  const [currency, setCurrency] = useState<string>("SAR");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) return;
    setSaving(true);
    try {
      await onCreate({
        candidateId,
        amount: num,
        currency: currency as "ETB" | "SAR" | "USD",
        notes: notes.trim() || undefined,
      });
      setAmount("6500");
      setNotes("");
      onOpenChange(false);
    } catch (err) {
      toast("Could not record fee", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record placement fee</DialogTitle>
          <DialogDescription>Fee earned from the employer for this placement.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="tabular"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["SAR", "ETB", "USD"].map((cur) => (
                    <SelectItem key={cur} value={cur}>
                      {cur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || Number(amount) <= 0}>
              {saving ? <Loader2 className="mr-2 size-3.5 animate-spin" /> : <Clock className="mr-2 size-3.5" />}
              Record fee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}