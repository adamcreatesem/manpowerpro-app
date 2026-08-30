import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertTriangle,
  CheckCircle2,
  HeartHandshake,
  Loader2,
  Plane,
  Undo2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type ReturnStatus = "on_site" | "completed" | "early_return" | "absconded";

const RETURN_LABELS: Record<ReturnStatus, string> = {
  on_site: "On site",
  completed: "Completed",
  early_return: "Early return",
  absconded: "Absconded",
};

const RETURN_VALUES: ReturnStatus[] = [
  "on_site",
  "completed",
  "early_return",
  "absconded",
];

interface RecordRow {
  candidateId: Id<"candidates">;
  candidateName: string;
  passportNumber: string | undefined | null;
  occupation: string | undefined | null;
  deployedAt: number | undefined;
  pro: string | undefined | null;
  record: {
    _id: Id<"postDeployment">;
    arrivalConfirmationDate?: string;
    employerName?: string;
    employerFeedback?: string;
    firstMonthCheckDate?: string;
    salaryStartDate?: string;
    firstSalaryReceived?: boolean;
    firstSalaryDate?: string;
    grievanceReported?: boolean;
    grievanceDescription?: string;
    grievanceResolved?: boolean;
    contractCompletionDate?: string;
    contractRenewed?: boolean;
    repatriationDate?: string;
    repatriationReason?: string;
    returnStatus?: ReturnStatus;
    notes?: string;
  } | null;
  grievanceOpen: boolean;
  needsIntake: boolean;
  attention: boolean;
}

const emptyForm = {
  arrivalConfirmationDate: "",
  employerName: "",
  employerFeedback: "",
  firstMonthCheckDate: "",
  salaryStartDate: "",
  firstSalaryReceived: false,
  firstSalaryDate: "",
  grievanceReported: false,
  grievanceDescription: "",
  grievanceResolved: false,
  contractCompletionDate: "",
  contractRenewed: false,
  repatriationDate: "",
  repatriationReason: "",
  returnStatus: "",
  notes: "",
};

export default function Aftercare() {
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const data = useQuery(api.aftercare.list, {
    filter: filter === "all" ? undefined : (filter as "attention" | "returned"),
  });
  const save = useMutation(api.aftercare.save);
  const resolveGrievance = useMutation(api.aftercare.resolveGrievance);
  const markSalaryReceived = useMutation(api.aftercare.markSalaryReceived);

  const summary = data?.summary;

  const openEditor = (row: RecordRow) => {
    const r = row.record;
    setEditing(row);
    setForm(
      r
        ? {
            arrivalConfirmationDate: r.arrivalConfirmationDate ?? "",
            employerName: r.employerName ?? "",
            employerFeedback: r.employerFeedback ?? "",
            firstMonthCheckDate: r.firstMonthCheckDate ?? "",
            salaryStartDate: r.salaryStartDate ?? "",
            firstSalaryReceived: r.firstSalaryReceived ?? false,
            firstSalaryDate: r.firstSalaryDate ?? "",
            grievanceReported: r.grievanceReported ?? false,
            grievanceDescription: r.grievanceDescription ?? "",
            grievanceResolved: r.grievanceResolved ?? false,
            contractCompletionDate: r.contractCompletionDate ?? "",
            contractRenewed: r.contractRenewed ?? false,
            repatriationDate: r.repatriationDate ?? "",
            repatriationReason: r.repatriationReason ?? "",
            returnStatus: r.returnStatus ?? "",
            notes: r.notes ?? "",
          }
        : emptyForm,
    );
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await save({
        candidateId: editing.candidateId,
        patch: {
          arrivalConfirmationDate: form.arrivalConfirmationDate || undefined,
          employerName: form.employerName || undefined,
          employerFeedback: form.employerFeedback || undefined,
          firstMonthCheckDate: form.firstMonthCheckDate || undefined,
          salaryStartDate: form.salaryStartDate || undefined,
          firstSalaryReceived: form.firstSalaryReceived || undefined,
          firstSalaryDate: form.firstSalaryDate || undefined,
          grievanceReported: form.grievanceReported || undefined,
          grievanceDescription: form.grievanceDescription || undefined,
          grievanceResolved: form.grievanceResolved || undefined,
          contractCompletionDate: form.contractCompletionDate || undefined,
          contractRenewed: form.contractRenewed || undefined,
          repatriationDate: form.repatriationDate || undefined,
          repatriationReason: form.repatriationReason || undefined,
          returnStatus: (form.returnStatus || undefined) as ReturnStatus | undefined,
          notes: form.notes || undefined,
        },
      });
      setOpen(false);
      toast("After-arrival record saved");
    } catch (err) {
      toast("Could not save record", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async (id: Id<"postDeployment">) => {
    try {
      await resolveGrievance({ id });
      toast("Grievance marked as resolved");
    } catch {
      toast("Could not update grievance");
    }
  };

  const handleSalary = async (id: Id<"postDeployment">) => {
    try {
      await markSalaryReceived({ id });
      toast("First salary confirmed");
    } catch {
      toast("Could not update salary status");
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
        <p className="text-label">After-care</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Deployed & on site
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracking workers after arrival — first salary, grievances, and
          contract completion or return.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Plane className="size-3.5" /> Deployed
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.total : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <UserCheck className="size-3.5" /> Awaiting intake
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.needingIntake : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No arrival confirmation yet
          </p>
        </div>
        <div className="rounded-lg border border-destructive/40 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-destructive">
            <AlertTriangle className="size-3.5" /> Grievances
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.grievancesOpen : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Open, unresolved</p>
        </div>
        <div className="rounded-lg border border-amber-500/40 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <Wallet className="size-3.5" /> Salary pending
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.salaryPending : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">First salary unpaid</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Undo2 className="size-3.5" /> Early returns
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.earlyReturns : "—"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: "all", label: "All deployed" },
          { key: "attention", label: "Needs attention" },
          { key: "returned", label: "Returned / completed" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No deployed candidates in this view.
        </p>
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {data.rows.map((row) => {
            const r = row.record;
            const returnStatus = r?.returnStatus;
            return (
              <div
                key={row.candidateId}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70">
                    <HeartHandshake
                      className="size-4 text-muted-foreground"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium">
                      <Link
                        to={`/app/candidates/${row.candidateId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.candidateName}
                      </Link>
                      <span className="ml-2 text-muted-foreground">
                        {row.passportNumber ?? ""}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.occupation ?? "Worker"}
                      {row.pro && <> · via {row.pro}</>}
                      {row.deployedAt && (
                        <>
                          {" "}
                          · departed{" "}
                          {new Date(row.deployedAt).toLocaleDateString("en-GB")}
                        </>
                      )}
                    </p>
                    {row.attention && (
                      <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                        {row.needsIntake
                          ? "Awaiting arrival confirmation"
                          : row.grievanceOpen
                            ? "Grievance open"
                            : "First salary pending"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r?.arrivalConfirmationDate && (
                    <Badge variant="outline">
                      <CheckCircle2 className="mr-1 size-3" />
                      Arrived
                    </Badge>
                  )}
                  {r?.firstSalaryReceived ? (
                    <Badge variant="outline">
                      <Wallet className="mr-1 size-3" />
                      Salary paid
                    </Badge>
                  ) : r?.salaryStartDate ? (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Salary pending
                    </Badge>
                  ) : null}
                  {r?.grievanceReported && (
                    <Badge
                      variant="outline"
                      className={
                        r.grievanceResolved
                          ? ""
                          : "border-destructive/40 text-destructive"
                      }
                    >
                      <AlertTriangle className="mr-1 size-3" />
                      {r.grievanceResolved ? "Resolved" : "Grievance"}
                    </Badge>
                  )}
                  {returnStatus && returnStatus !== "on_site" && (
                    <Badge variant="outline">
                      <Undo2 className="mr-1 size-3" />
                      {RETURN_LABELS[returnStatus]}
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(row)}
                  >
                    {r ? "Edit record" : "Record intake"}
                  </Button>
                  {r?.grievanceReported && !r.grievanceResolved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResolve(r._id)}
                    >
                      Resolve grievance
                    </Button>
                  )}
                  {r && !r.firstSalaryReceived && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSalary(r._id)}
                    >
                      Confirm salary
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.record ? "After-arrival record" : "Record intake"}
            </DialogTitle>
            <DialogDescription>
              {editing?.candidateName} — deployed on{" "}
              {editing?.deployedAt
                ? new Date(editing.deployedAt).toLocaleDateString("en-GB")
                : "—"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ac-arrival">Arrival confirmed</Label>
                <Input
                  id="ac-arrival"
                  type="date"
                  value={form.arrivalConfirmationDate}
                  onChange={(e) =>
                    setForm({ ...form, arrivalConfirmationDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-check">First-month check</Label>
                <Input
                  id="ac-check"
                  type="date"
                  value={form.firstMonthCheckDate}
                  onChange={(e) =>
                    setForm({ ...form, firstMonthCheckDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-employer">Employer / sponsor</Label>
              <Input
                id="ac-employer"
                value={form.employerName}
                onChange={(e) =>
                  setForm({ ...form, employerName: e.target.value })
                }
                placeholder="Al Rajhi Family Services"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-feedback">Employer feedback</Label>
              <Textarea
                id="ac-feedback"
                value={form.employerFeedback}
                onChange={(e) =>
                  setForm({ ...form, employerFeedback: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ac-salary-start">Salary start date</Label>
                <Input
                  id="ac-salary-start"
                  type="date"
                  value={form.salaryStartDate}
                  onChange={(e) =>
                    setForm({ ...form, salaryStartDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ac-salary-date">First salary date</Label>
                <Input
                  id="ac-salary-date"
                  type="date"
                  value={form.firstSalaryDate}
                  onChange={(e) =>
                    setForm({ ...form, firstSalaryDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.firstSalaryReceived}
                  onCheckedChange={(v) =>
                    setForm({ ...form, firstSalaryReceived: v === true })
                  }
                />
                First salary received
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.grievanceReported}
                  onCheckedChange={(v) =>
                    setForm({ ...form, grievanceReported: v === true })
                  }
                />
                Grievance reported
              </label>
            </div>
            {form.grievanceReported && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ac-grievance">Grievance description</Label>
                  <Textarea
                    id="ac-grievance"
                    value={form.grievanceDescription}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        grievanceDescription: e.target.value,
                      })
                    }
                    rows={2}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.grievanceResolved}
                    onCheckedChange={(v) =>
                      setForm({ ...form, grievanceResolved: v === true })
                    }
                  />
                  Resolved
                </label>
              </>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ac-completion">Contract completion</Label>
                <Input
                  id="ac-completion"
                  type="date"
                  value={form.contractCompletionDate}
                  onChange={(e) =>
                    setForm({ ...form, contractCompletionDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Return status</Label>
                <Select
                  value={form.returnStatus}
                  onValueChange={(v) => setForm({ ...form, returnStatus: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Still on site" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETURN_VALUES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {RETURN_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-return-reason">Repatriation reason</Label>
              <Textarea
                id="ac-return-reason"
                value={form.repatriationReason}
                onChange={(e) =>
                  setForm({ ...form, repatriationReason: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-notes">Notes</Label>
              <Textarea
                id="ac-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
