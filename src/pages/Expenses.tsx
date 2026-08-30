import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const EXPENSE_TYPES = [
  "medical",
  "visa",
  "training",
  "travel",
  "documentation",
  "insurance",
  "accommodation",
  "other",
] as const;
const TYPE_LABELS: Record<string, string> = {
  medical: "Medical",
  visa: "Visa",
  training: "Training",
  travel: "Travel",
  documentation: "Documentation",
  insurance: "Insurance",
  accommodation: "Accommodation",
  other: "Other",
};
const PAID_BY = ["candidate", "employer", "agency"] as const;
const PAIDBY_LABELS: Record<string, string> = {
  candidate: "Candidate",
  employer: "Employer",
  agency: "Agency",
};
const CURRENCIES = ["ETB", "SAR", "USD"] as const;

export default function Expenses() {
  const [type, setType] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    candidateId: "",
    expenseType: "medical",
    description: "",
    amount: "",
    currency: "ETB",
    paidBy: "agency",
    notes: "",
  });

  const data = useQuery(api.expenses.list, {
    expenseType: type === "all" ? undefined : (type as (typeof EXPENSE_TYPES)[number]),
  });
  const candidates = useQuery(api.candidates.list, {});
  const feesData = useQuery(api.fees.list, { status: "paid" });
  const create = useMutation(api.expenses.create);
  const remove = useMutation(api.expenses.remove);

  const candidateOptions = useMemo(
    () =>
      (candidates ?? []).map((c) => ({
        id: c._id,
        label: `${c.firstName} ${c.lastName} · ${c.passportNumber ?? "—"}`,
      })),
    [candidates],
  );

  const expenses = data?.expenses ?? [];
  const totalByCurrency = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of expenses) acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
    return acc;
  }, [expenses]);
  const agencyByCurrency = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const e of expenses)
      if (e.paidBy === "agency") acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
    return acc;
  }, [expenses]);
  const topType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of expenses) counts[e.expenseType] = (counts[e.expenseType] ?? 0) + 1;
    const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return best ? TYPE_LABELS[best[0]] ?? best[0] : "—";
  }, [expenses]);
  const netCollected = useMemo(() => {
    const paid = feesData?.summary.paidByCurrency ?? {};
    return Object.entries(paid)
      .filter(([, n]) => n > 0)
      .map(
        ([c, n]) =>
          `${c} ${((n ?? 0) - (totalByCurrency[c] ?? 0)).toLocaleString("en-US")}`,
      );
  }, [feesData, totalByCurrency]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.candidateId) {
      toast("Pick a candidate for this expense");
      return;
    }
    if (!form.description.trim()) {
      toast("Describe the expense");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast("Enter a valid amount");
      return;
    }
    setBusy(true);
    try {
      await create({
        candidateId: form.candidateId as Id<"candidates">,
        expenseType: form.expenseType as (typeof EXPENSE_TYPES)[number],
        description: form.description.trim(),
        amount,
        currency: form.currency as "ETB" | "SAR" | "USD",
        paidBy: form.paidBy as "candidate" | "employer" | "agency",
        notes: form.notes || undefined,
      });
      setOpen(false);
      setForm({
        candidateId: "",
        expenseType: "medical",
        description: "",
        amount: "",
        currency: "ETB",
        paidBy: "agency",
        notes: "",
      });
      toast("Expense recorded");
    } catch (err) {
      toast("Could not record expense", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (id: Id<"candidateExpenses">) => {
    try {
      await remove({ id });
      toast("Expense removed");
    } catch {
      toast("Could not remove expense");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">Costs</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Expenses
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Per-placement costs — medical, visa, training, travel and more.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add expense
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total spend
          </p>
          <p className="font-display mt-1 text-2xl">
            {Object.entries(totalByCurrency).length
              ? Object.entries(totalByCurrency)
                  .map(([c, n]) => `${c} ${n.toLocaleString("en-US")}`)
                  .join(" · ")
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {data ? `${data.summary.totalCount} costs logged` : "…"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Net collected
          </p>
          <p className="font-display mt-1 text-2xl">
            {netCollected.length ? netCollected.join(" · ") : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Paid placement fees minus costs
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Top category
          </p>
          <p className="font-display mt-1 text-2xl">{topType}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Most common cost type
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Agency covers
          </p>
          <p className="font-display mt-1 text-2xl">
            {Object.entries(agencyByCurrency).length
              ? Object.entries(agencyByCurrency)
                  .map(([c, n]) => `${c} ${n.toLocaleString("en-US")}`)
                  .join(" · ")
              : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Costs paid by the agency
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", ...EXPENSE_TYPES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              type === t
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "all" ? "All" : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {expenses.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No expenses in this view.
            </p>
          )}
          {expenses.map((e) => (
            <div
              key={e._id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium">
                  <Link
                    to={`/app/candidates/${e.candidateId}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {e.candidateName}
                  </Link>
                  <span className="ml-2 text-muted-foreground">
                    {e.amount.toLocaleString("en-US")} {e.currency}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {TYPE_LABELS[e.expenseType] ?? e.expenseType} ·{" "}
                  {e.description}
                  {e.notes && <> · {e.notes}</>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {PAIDBY_LABELS[e.paidBy] ?? e.paidBy}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleRemove(e._id)}
                  aria-label="Remove expense"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add expense</DialogTitle>
            <DialogDescription>
              A cost incurred for this candidate's placement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select
                value={form.candidateId}
                onValueChange={(v) => setForm({ ...form, candidateId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidateOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.expenseType}
                  onValueChange={(v) => setForm({ ...form, expenseType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Paid by</Label>
                <Select
                  value={form.paidBy}
                  onValueChange={(v) => setForm({ ...form, paidBy: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAID_BY.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PAIDBY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-desc">Description</Label>
              <Input
                id="e-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Medical exam at St. Paul's Clinic"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="e-amount">Amount</Label>
                <Input
                  id="e-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm({ ...form, currency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-notes">Notes</Label>
              <Textarea
                id="e-notes"
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
                Add expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
