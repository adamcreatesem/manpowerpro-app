import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Loader2,
  TrendingUp,
  Users,
  Waypoints,
} from "lucide-react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { initials } from "@/lib/format";

export default function Staff() {
  const data = useQuery(api.staff.performance);
  const summary = data?.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Staff</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Performance by desk
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Who is moving files, who is carrying the workload, and where files
          are getting stuck — live from the pipeline, tasks and activity trail.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> Team
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.staff : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Office members</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Waypoints className="size-3.5" /> Files assigned
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.assigned : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Across the team</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <TrendingUp className="size-3.5" /> Deployed
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.deployed : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Files to Saudi</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <ClipboardList className="size-3.5" /> Open tasks
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.openTasks : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Pending on desks</p>
        </div>
        <div
          className={`rounded-lg border p-4 ${
            summary && summary.stuck > 0
              ? "border-amber-500/40"
              : "border-border/70"
          }`}
        >
          <p
            className={`flex items-center gap-1.5 text-xs uppercase tracking-wide ${
              summary && summary.stuck > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-muted-foreground"
            }`}
          >
            <AlertTriangle className="size-3.5" /> Stuck files
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.stuck : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No movement in 21+ days
          </p>
        </div>
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No office staff found on this account.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Staff member</th>
                <th className="px-4 py-3 font-medium">Assigned</th>
                <th className="px-4 py-3 font-medium">Deployed</th>
                <th className="px-4 py-3 font-medium">Open tasks</th>
                <th className="px-4 py-3 font-medium">Completed</th>
                <th className="px-4 py-3 font-medium">Stuck</th>
                <th className="px-4 py-3 font-medium">This week</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {data.rows.map((row) => (
                <tr key={row.userId} className="align-top">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {initials(row.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
                          {row.name}
                          <Badge variant="outline">{row.roleLabel}</Badge>
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {row.email ?? "—"} · {row.activityCount} logged actions
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-display text-base">
                    {row.assigned}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-display text-base">{row.deployed}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.conversion}% conversion
                    </p>
                  </td>
                  <td className="px-4 py-3.5 font-display text-base">
                    {row.openTasks}
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="flex items-center gap-1 font-display text-base">
                      {row.completedTasks > 0 && (
                        <CheckCircle2 className="size-3.5 text-muted-foreground" />
                      )}
                      {row.completedTasks}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p
                      className={`font-display text-base ${
                        row.stuck > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : ""
                      }`}
                    >
                      {row.stuck}
                    </p>
                    {row.avgStageDays > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {row.avgStageDays}d avg stage
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {row.metric ? (
                      <p className="max-w-[190px]">
                        <span className="text-foreground">
                          {row.metric.totalActions} actions
                        </span>
                        {" · "}
                        {row.metric.candidatesCreated} files opened
                        {" · "}
                        {row.metric.proceduresCompleted} procedures
                        {" · "}
                        {row.metric.avgStatusChangeTime}d avg change
                        {row.metric.rejectionRate != null && (
                          <>
                            {" · "}
                            {(row.metric.rejectionRate * 100).toFixed(0)}% reject
                          </>
                        )}
                      </p>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <BarChart3 className="size-3.5" /> No weekly data yet
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
