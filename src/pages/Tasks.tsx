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
import { CheckCircle2, Circle, Loader2, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const DEPARTMENTS: Record<string, string> = {
  reception: "Reception",
  info_desk: "Info Desk",
  data_entry: "Data Entry",
  document_control: "Document Control",
};

const STATUS = ["pending", "in_progress", "completed", "cancelled"] as const;

export default function Tasks() {
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "info_desk",
    priority: "medium",
    candidateId: "",
    dueDate: "",
    description: "",
  });

  const rows = useQuery(api.tasks.list, {
    status: status === "all" ? undefined : (status as never),
  });
  const candidates = useQuery(api.candidates.list, {});
  const create = useMutation(api.tasks.create);
  const setTaskStatus = useMutation(api.tasks.setStatus);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast("Task title is required");
      return;
    }
    setBusy(true);
    try {
      await create({
        title: form.title.trim(),
        department: form.department as
          | "reception"
          | "info_desk"
          | "data_entry"
          | "document_control",
        description: form.description || undefined,
        priority:
          (form.priority as "low" | "medium" | "high" | "urgent") || undefined,
        relatedCandidateId: form.candidateId
          ? (form.candidateId as Id<"candidates">)
          : undefined,
        dueDate: form.dueDate
          ? new Date(`${form.dueDate}T00:00:00`).getTime()
          : undefined,
      });
      setOpen(false);
      setForm({
        title: "",
        department: "info_desk",
        priority: "medium",
        candidateId: "",
        dueDate: "",
        description: "",
      });
      toast("Task created");
    } catch (err) {
      toast("Could not create task", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (
    id: Id<"staffTasks">,
    next: "in_progress" | "completed",
  ) => {
    try {
      await setTaskStatus({ id, status: next });
      toast(next === "completed" ? "Task completed" : "Task in progress");
    } catch {
      toast("Could not update task");
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
          <p className="text-label">Daily records</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each desk keeps its own record of what's being handled.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          New task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", ...STATUS].map((s) => (
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
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {!rows ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="divide-y divide-border/70 border-y border-border/70">
          {rows.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No tasks in this view.
            </p>
          )}
          {rows.map((t) => {
            const isDone = t.status === "completed";
            return (
              <div
                key={t._id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3 ${
                  isDone ? "opacity-60" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      toggleStatus(t._id, isDone ? "in_progress" : "completed")
                    }
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    title={isDone ? "Reopen" : "Complete"}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Circle className="size-4" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">
                      {t.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {DEPARTMENTS[t.department] ?? t.department}
                      {t.priority && (
                        <span className="ml-2 uppercase text-[10px] tracking-wide">
                          {t.priority}
                        </span>
                      )}
                      {t.candidateName && (
                        <>
                          {" · "}
                          <Link
                            to={`/app/candidates/${t.relatedCandidateId}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {t.candidateName}
                          </Link>
                        </>
                      )}
                      {t.dueDate && (
                        <>
                          {" · due "}
                          {new Date(t.dueDate).toLocaleDateString("en-GB")}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "in_progress" && (
                    <span className="text-[11px] text-muted-foreground">
                      {t.assigneeName ?? "Unassigned"}
                    </span>
                  )}
                  {!isDone && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleStatus(t._id, "completed")}
                    >
                      Complete
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
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Assign it to a desk and, optionally, a candidate file.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-title">Title</Label>
              <Input
                id="t-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm({ ...form, department: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEPARTMENTS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select
                value={form.candidateId}
                onValueChange={(v) => setForm({ ...form, candidateId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="General task (no file)" />
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
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Due date</Label>
              <Input
                id="t-due"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">Notes</Label>
              <Textarea
                id="t-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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
                Create task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
