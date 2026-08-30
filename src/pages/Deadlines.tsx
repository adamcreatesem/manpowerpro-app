import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Stethoscope,
  FileText,
  Plane,
  Receipt,
  ShieldCheck,
  Stamp,
  ListChecks,
} from "lucide-react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router";

type Kind = "medical" | "insurance" | "visa" | "fee" | "task" | "sla";

const KIND_META: Record<
  Kind,
  { label: string; icon: typeof Stethoscope; chip: string }
> = {
  medical: { label: "Medical", icon: Stethoscope, chip: "Medical" },
  insurance: { label: "Insurance", icon: ShieldCheck, chip: "Insurance" },
  visa: { label: "Visa", icon: Stamp, chip: "Visa" },
  fee: { label: "Fee", icon: Receipt, chip: "Fee" },
  task: { label: "Task", icon: ListChecks, chip: "Task" },
  sla: { label: "SLA", icon: Clock3, chip: "Deployment" },
};

const KINDS: Kind[] = ["medical", "insurance", "visa", "fee", "task", "sla"];

const STATUS_META = {
  overdue: {
    label: "Overdue",
    dot: "bg-destructive",
    text: "text-destructive",
    icon: AlertTriangle,
  },
  due_soon: {
    label: "Due soon",
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock3,
  },
  upcoming: {
    label: "Upcoming",
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    icon: CalendarClock,
  },
} as const;

function daysLabel(daysLeft: number): string {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}d overdue`;
  if (daysLeft === 0) return "Due today";
  return `in ${daysLeft}d`;
}

export default function Deadlines() {
  const [kind, setKind] = useState<string>("all");
  const [view, setView] = useState<string>("all");

  const data = useQuery(api.deadlines.list, {
    kind: kind === "all" ? undefined : (kind as Kind),
  });

  const summary = data?.summary;

  const groups = useMemo(() => {
    if (!data) return null;
    const order: Array<"overdue" | "due_soon" | "upcoming"> = [
      "overdue",
      "due_soon",
      "upcoming",
    ];
    return order
      .map((status) => ({
        status,
        items: data.items.filter((i) => i.status === status),
      }))
      .filter((g) => g.items.length > 0);
  }, [data, view]);

  const visibleGroups = useMemo(() => {
    if (!groups) return null;
    if (view === "all") return groups;
    return groups.filter((g) => g.status === view);
  }, [groups, view]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Docketing</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Deadlines & expiries
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Medical certificates, insurance, visas, fee due dates and the
          30-day deployment target — nothing slips.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-destructive/40 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-destructive">
            <AlertTriangle className="size-3.5" /> Overdue
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.overdue : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Needs action today
          </p>
        </div>
        <div className="rounded-lg border border-amber-500/40 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-amber-600 dark:text-amber-400">
            <Clock3 className="size-3.5" /> Due soon
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.dueSoon : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Within the next 14 days
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="size-3.5" /> Upcoming
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.upcoming : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">On the horizon</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <CheckCircle2 className="size-3.5" /> Total tracked
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.total : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across all desks</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", ...KINDS].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              kind === k
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "all" ? "All types" : KIND_META[k as Kind].chip}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {["all", "overdue", "due_soon", "upcoming"].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              view === v
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "all" ? "All statuses" : STATUS_META[v as "overdue" | "due_soon" | "upcoming"].label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nothing on the docket for this view.
        </p>
      ) : (
        <div className="space-y-8">
          {(visibleGroups ?? []).map((group) => {
            const meta = STATUS_META[group.status];
            const StatusIcon = meta.icon;
            return (
              <section key={group.status}>
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${meta.dot}`} />
                  <h2 className="text-sm font-semibold tracking-tight">
                    {meta.label}
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    {group.items.length}
                  </span>
                </div>
                <div className="mt-3 divide-y divide-border/70 border-y border-border/70">
                  {group.items.map((item) => {
                    const kindMeta = KIND_META[item.kind];
                    const KindIcon = kindMeta.icon;
                    return (
                      <div
                        key={item.key}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70">
                            <KindIcon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium">
                              {item.candidateId ? (
                                <Link
                                  to={`/app/candidates/${item.candidateId}`}
                                  className="underline-offset-2 hover:underline"
                                >
                                  {item.title}
                                </Link>
                              ) : (
                                item.title
                              )}
                              <span
                                className={`ml-2 text-xs font-medium ${meta.text}`}
                              >
                                {daysLabel(item.daysLeft)}
                              </span>
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.candidateName ?? "Office task"}
                              {item.subtitle && <> · {item.subtitle}</>}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {kindMeta.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {visibleGroups !== null && visibleGroups.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nothing in this status.
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
