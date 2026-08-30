import { api } from "@/convex/_generated/api";
import { PIPELINE_STAGES } from "@/lib/stages";
import { daysInStage, initials } from "@/lib/format";
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
import { Loader2, Plus, Search, UserPlus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const STAGE_DOT: Record<string, string> = {
  Departed: "bg-foreground",
  Exited: "bg-destructive/70",
};

export default function Candidates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    passportNumber: "",
    phone: "",
    gender: "",
    occupation: "",
    region: "",
  });

  const create = useMutation(api.candidates.create);
  const rows = useQuery(api.candidates.list, {
    search: search || undefined,
    stage: stage === "all" ? undefined : stage,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.passportNumber.trim()) {
      toast("First name and passport number are required");
      return;
    }
    setBusy(true);
    try {
      const id = await create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        passportNumber: form.passportNumber.trim(),
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        occupation: form.occupation || undefined,
        region: form.region || undefined,
      });
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        passportNumber: "",
        phone: "",
        gender: "",
        occupation: "",
        region: "",
      });
      toast("File opened", {
        description: `${form.firstName} ${form.lastName} added to New Entry.`,
      });
      navigate(`/app/candidates/${id}`);
    } catch (err) {
      toast("Could not create the file", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
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
          <p className="text-label">Register</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Candidates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every file in the office, from intake to departure.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          New candidate
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, passport, labor ID…"
            className="pl-9"
          />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {PIPELINE_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {!rows ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium">No files match</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Try a different search, or open a new file.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border/80">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-label">
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Department
                </th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Employer
                </th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">
                  Tasks
                </th>
                <th className="px-4 py-3 text-right font-medium">In stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((c) => (
                <tr
                  key={c._id}
                  onClick={() => navigate(`/app/candidates/${c._id}`)}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials(`${c.firstName ?? ""} ${c.lastName ?? ""}`)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.passportNumber ?? "—"}
                          {c.occupation ? ` · ${c.occupation}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`size-1.5 rounded-full ${
                          STAGE_DOT[c.derivedStage] ?? "bg-muted-foreground/50"
                        }`}
                      />
                      {c.derivedStage}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {c.department}
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                    {c.employerName ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    {c.openTasks > 0 ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {c.openTasks}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="tabular px-4 py-3 text-right text-muted-foreground">
                    {daysInStage(c.stageEnteredAt)}d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Open a new file</DialogTitle>
            <DialogDescription>
              Personal details and passport number. The file starts at New
              Entry.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-first">First name</Label>
                <Input
                  id="c-first"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-last">Last name</Label>
                <Input
                  id="c-last"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-pass">Passport number</Label>
              <Input
                id="c-pass"
                value={form.passportNumber}
                onChange={(e) =>
                  setForm({ ...form, passportNumber: e.target.value })
                }
                placeholder="EP1000001"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-phone">Phone</Label>
                <Input
                  id="c-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+251 91 000 0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="c-occ">Occupation</Label>
                <Input
                  id="c-occ"
                  value={form.occupation}
                  onChange={(e) =>
                    setForm({ ...form, occupation: e.target.value })
                  }
                  placeholder="Domestic worker"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="c-reg">Region</Label>
                <Input
                  id="c-reg"
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  placeholder="Addis Ababa"
                />
              </div>
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 size-4" />
                )}
                Open file
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
