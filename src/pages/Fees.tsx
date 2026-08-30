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
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const CURRENCIES = ["SAR", "ETB", "USD"] as const;

export default function Fees() {
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    candidateId: "",
    amount: "",
    currency: "SAR",
    dueDate: "",
    notes: "",
  });

  const data = useQuery(api.fees.list, {
    status: status === "all" ? undefined : (status as "arranged" | "paid"),
  });
  const candidates = useQuery(api.candidates.list, {});
  const create = useMutation(api.fees.create);
  const markPaid = useMutation(api.fees.markPaid);

  const candidateOptions = useMemo(
    () =>
      (candidates ?? [])
        .filter((c) => c.derivedStage !== "Exited")
        .map((c) => ({
          id: c._id,
          label: `${c.firstName} ${c.lastName} · ${c.passportNumber ?? "—"}`,
        })),
    [candidates],
  );

  const summary = data?.summary;
  const outstandingTotal = summary
    ? Object.entries(summary.outstandingByCurrency).map(([c, n]) => `${c} ${n.toLocaleString("en-US")}`)
    : [];
  const paidTotal = summary
    ? Object.entries(summary.paidByCurrency).map(([c, n]) => `${c} ${n.toLocaleString("en-US")}`)
    : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.candidateId) {
      toast("Pick a candidate for this fee");
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
        amount,
        currency: form.currency as "SAR" | "ETB" | "USD",
        dueAt: form.dueDate
          ? new Date(`${form.dueDate}T00:00:00`).getTime()
          : undefined,
        notes: form.notes || undefined,
      });
      setOpen(false);
      setForm({
        candidateId: "",
        amount: "",
        currency: "SAR",
        dueDate: "",
        notes: "",
      });
      toast("Placement fee recorded");
    } catch (err) {
      toast("Could not record fee", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async (id: Id<"fees">) => {
    try {
      await markPaid({ id });
      toast("Fee marked as paid");
    } catch {
      toast("Could not update fee");
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
          <p className="text-label">Placements</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Fees
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placement fees earned from Saudi employers.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          Record fee
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Outstanding
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.outstandingCount : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {outstandingTotal.length
              ? outstandingTotal.join(" · ")
              : "Nothing due"}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Paid
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.paidCount : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {paidTotal.length ? paidTotal.join(" · ") : "Nothing collected yet"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "arranged", "paid"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              status === s
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {data.fees.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No fees in this view.
            </p>
          )}
          {data.fees.map((f) => {
            const isPaid = f.status === "paid";
            return (
              <div
                key={f._id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                  isPaid ? "opacity-60" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    <Link
                      to={`/app/candidates/${f.candidateId}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {f.candidateName}
                    </Link>
                    <span className="ml-2 text-muted-foreground">
                      {f.amount.toLocaleString("en-US")} {f.currency}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {f.clientName ?? "No employer linked"}
                    {f.dueAt && (
                      <>
                        {" · due "}
                        {new Date(f.dueAt).toLocaleDateString("en-GB")}
                      </>
                    )}
                    {f.notes && <> · {f.notes}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isPaid ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-4" />
                      Paid
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMarkPaid(f._id)}
                    >
                      Mark paid
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record placement fee</DialogTitle>
            <DialogDescription>
              Fee agreed with the employer for this placement.
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
                <Label htmlFor="f-amount">Amount</Label>
                <Input
                  id="f-amount"
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
              <Label htmlFor="f-due">Due date</Label>
              <Input
                id="f-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-notes">Notes</Label>
              <Textarea
                id="f-notes"
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
                Record fee
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
