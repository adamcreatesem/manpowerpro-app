import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { PIPELINE_STAGES } from "@/lib/stages";
import { fmtDate, money, relativeTime } from "@/lib/format";
import { AlertTriangle, ArrowRight, CircleAlert, Loader2, Plane, Wallet } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Link } from "react-router";

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="border-r border-border/70 pr-6 last:border-r-0">
      <p className="text-label">{label}</p>
      <p className="tabular mt-1.5 text-[26px] font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const ALERT_STYLE: Record<string, string> = {
  expired: "border-destructive/40 bg-destructive/5 text-destructive",
  today: "border-border bg-muted",
  soon: "border-border bg-muted/60",
};

export default function Dashboard() {
  const { user } = useAuth();
  const data = useQuery(api.dashboard.overview);
  const alerts = useQuery(api.alerts.list);
  const seed = useMutation(api.seed.run);

  if (!data || !alerts) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const maxStage = Math.max(1, ...Object.values(data.byStage));
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">Office overview</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            {fmtDate(Date.now())}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Good day, {firstName}. Here's where the files stand.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="hidden items-center gap-1.5 sm:flex">
            <Plane className="size-3.5" /> {data.totals.deployed} deployed
          </span>
          <Link
            to="/app/candidates"
            className="group inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            New candidate
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {alerts.items.length > 0 && (
        <div className="space-y-2">
          {alerts.items.slice(0, 4).map((a) => (
            <Link
              key={a.key}
              to={a.route}
              className={`flex items-start gap-3 rounded-md border px-4 py-3 transition-colors hover:opacity-90 ${ALERT_STYLE[a.level]}`}
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-snug">{a.title}</p>
                <p className="mt-0.5 text-xs opacity-80">{a.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Candidates" value={data.totals.candidates} />
        <Stat label="Active files" value={data.totals.active} />
        <Stat label="Deployed" value={data.totals.deployed} />
        <Stat
          label="Open tasks"
          value={data.totals.openTasks}
          hint={
            data.totals.overdue > 0
              ? `${data.totals.overdue} overdue`
              : `${data.totals.dueToday} due today`
          }
        />
        <Stat
          label="Fees outstanding"
          value={data.totals.outstandingFees}
          hint="placement fees"
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* Stage distribution */}
        <section className="lg:col-span-2">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Where the files are
            </h2>
            <Link
              to="/app/pipeline"
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Open pipeline →
            </Link>
          </div>
          <div className="divide-y divide-border/70 border-y border-border/70">
            {PIPELINE_STAGES.map((stage) => {
              const n = data.byStage[stage] ?? 0;
              if (n === 0 && stage !== "Departed") return null;
              return (
                <div key={stage} className="flex items-center gap-4 py-2.5">
                  <p className="w-44 shrink-0 truncate text-[13px] text-foreground sm:w-52">
                    {stage}
                  </p>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground/80"
                      style={{ width: `${(n / maxStage) * 100}%` }}
                    />
                  </div>
                  <p className="tabular w-8 shrink-0 text-right text-[13px] font-medium">
                    {n}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Upcoming departures */}
          {data.upcomingDepartures.length > 0 && (
            <div className="mt-10">
              <h2 className="mb-4 text-[15px] font-semibold tracking-tight">
                Upcoming departures
              </h2>
              <div className="divide-y divide-border/70 border-y border-border/70">
                {data.upcomingDepartures.map((d) => (
                  <Link
                    key={d._id}
                    to={`/app/candidates/${d.candidateId}`}
                    className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-[13px] font-medium">{d.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.destination ?? "Saudi Arabia"}
                        {d.flightNumber ? ` · ${d.flightNumber}` : ""}
                      </p>
                    </div>
                    <p className="tabular text-[13px] text-muted-foreground">
                      {d.departureDate ? fmtDate(d.departureDate) : "—"}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right column */}
        <section className="space-y-10">
          {/* Fees summary */}
          <div>
            <h2 className="mb-4 text-[15px] font-semibold tracking-tight">
              Placement fees
            </h2>
            <div className="rounded-md border border-border/80 bg-card p-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="size-4" />
                <p className="text-label">Outstanding</p>
              </div>
              {Object.keys(data.fees.outstandingByCurrency).length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Everything is settled.
                </p>
              ) : (
                <div className="mt-3 space-y-1.5">
                  {Object.entries(data.fees.outstandingByCurrency).map(
                    ([c, n]) => (
                      <div
                        key={c}
                        className="flex items-baseline justify-between"
                      >
                        <p className="tabular text-xl font-semibold tracking-tight">
                          {money(n, c)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.totals.outstandingFees} fee
                          {data.totals.outstandingFees === 1 ? "" : "s"}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              )}
              <Link
                to="/app/fees"
                className="mt-4 inline-block text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Fee ledger →
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="mb-4 text-[15px] font-semibold tracking-tight">
              Recent activity
            </h2>
            <div className="divide-y divide-border/70 border-y border-border/70">
              {data.recent.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  No activity yet.
                </p>
              )}
              {data.recent.map((ev) => (
                <div key={ev._id} className="flex items-start gap-3 py-2.5">
                  <div className="mt-1 flex size-1.5 shrink-0 rounded-full bg-foreground/50" />
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">
                      {ev.text}
                      {ev.candidateId && (
                        <Link
                          to={`/app/candidates/${ev.candidateId}`}
                          className="ml-1 font-medium underline-offset-2 hover:underline"
                        >
                          view
                        </Link>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ev.actorName ?? "System"} · {relativeTime(ev.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Empty state: offer to load the demo dataset */}
      {data.totals.candidates === 0 && (
        <div className="rounded-md border border-border bg-card p-6 text-center">
          <AlertTriangle className="mx-auto size-5 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">
            No candidate files yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
            Load the demo dataset — realistic candidates, employers, fees and
            tasks — so every screen has something to show.
          </p>
          <button
            type="button"
            onClick={async () => {
              try {
                await seed();
              } catch {
                /* seed is guarded; ignore */
              }
            }}
            className="mt-4 rounded-md bg-foreground px-4 py-2 text-[13px] font-medium text-background transition-opacity hover:opacity-90"
          >
            Load demo data
          </button>
        </div>
      )}
    </motion.div>
  );
}
