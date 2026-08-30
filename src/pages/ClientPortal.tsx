import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { fmtDate } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Link } from "react-router";

const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  requested: { label: "Requested", className: "border-border text-muted-foreground" },
  open: { label: "Open", className: "border-border text-muted-foreground" },
  in_progress: { label: "In progress", className: "border-foreground text-foreground" },
  filled: { label: "Filled", className: "border-border text-muted-foreground" },
  cancelled: { label: "Cancelled", className: "border-border text-muted-foreground" },
  on_hold: { label: "On hold", className: "border-border text-muted-foreground" },
};

const NITAQAT: Record<string, string> = {
  platinum: "border-border bg-muted text-muted-foreground",
  high_green: "border-border bg-muted text-foreground",
  green: "border-border bg-muted text-foreground",
  yellow: "border-border bg-muted text-muted-foreground",
  red: "border-destructive/40 bg-destructive/5 text-destructive",
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
      <p className="tabular mt-1.5 text-[26px] font-semibold tracking-tight">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function ClientPortal() {
  const { user } = useAuth();
  const data = useQuery(api.clients.overview);

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalPositions = data.orders.reduce((n, o) => n + o.quantity, 0);
  const filledPositions = data.orders.reduce((n, o) => n + o.filled, 0);
  const inProgress = data.orders.reduce(
    (n, o) =>
      n +
      o.candidates.filter((c) => c.flightStat !== "DEPARTED").length,
    0,
  );

  return (
    <motion.div {...fade} transition={{ duration: 0.3 }} className="space-y-10">
      {/* Header */}
      <div>
        <p className="text-label">Client portal</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-normal tracking-tight">
            {data.client.name}
          </h1>
          {data.client.nitaqatColor && (
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                NITAQAT[data.client.nitaqatColor] ?? "border-border text-muted-foreground"
              }`}
            >
              Nitaqat · {data.client.nitaqatColor.replace("_", " ")}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.client.contactPerson ?? "Your account"} — this is where your
          recruitment orders and their candidates stand.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
        <Stat label="Open orders" value={data.orders.length} />
        <Stat label="Positions" value={totalPositions} hint={`${filledPositions} filled`} />
        <Stat label="Candidates in process" value={inProgress} />
        <Stat
          label="Ready to deploy"
          value={data.orders.reduce(
            (n, o) =>
              n +
              o.candidates.filter(
                (c) => c.derivedStage === "Flight Booked" || c.derivedStage === "Departed",
              ).length,
            0,
          )}
          hint="booked or departed"
        />
      </div>

      {/* Orders */}
      <div className="space-y-6">
        {data.orders.length === 0 && (
          <div className="rounded-md border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium">No orders yet</p>
            <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
              When the agency opens a recruitment order for you, it will appear
              here with the candidates working through it.
            </p>
          </div>
        )}

        {data.orders.map((order) => {
          const status = ORDER_STATUS[order.status] ?? ORDER_STATUS.open;
          const pct =
            order.quantity > 0
              ? Math.min(100, Math.round((order.filled / order.quantity) * 100))
              : 0;
          return (
            <section
              key={order._id}
              className="rounded-md border border-border/80 bg-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-[16px] font-semibold tracking-tight">
                      {order.title}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {order.position}
                    {order.location ? ` · ${order.location}` : ""}
                    {order.salary ? ` · ${order.salary}` : ""}
                    {order.contractDuration ? ` · ${order.contractDuration}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular text-xl font-semibold tracking-tight">
                    {order.filled}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {order.quantity}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    positions filled
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3 px-6 pt-4">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="tabular w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {pct}%
                </p>
              </div>

              {/* Candidates */}
              {order.candidates.length > 0 ? (
                <div className="divide-y divide-border/70 px-6 pb-2 pt-3">
                  {order.candidates.map((c) => (
                    <Link
                      key={c._id}
                      to={`/app/candidates/${c._id}`}
                      className="flex items-center justify-between gap-4 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <p className="truncate text-[13px] font-medium">
                          {c.firstName} {c.lastName}
                        </p>
                        <p className="tabular hidden shrink-0 text-xs text-muted-foreground sm:inline">
                          {c.passportNumber ?? ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        {c.flightStat === "DEPARTED" && (
                          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                            Departed
                          </span>
                        )}
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-[11px] font-medium text-foreground">
                          {c.derivedStage}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-6 pb-4 pt-3 text-[13px] text-muted-foreground">
                  No candidates assigned yet.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Progress shown as of {fmtDate(Date.now())}. For anything urgent, call
        your agency contact at Tahlia Foreign Employment Agency.
      </p>
    </motion.div>
  );
}
