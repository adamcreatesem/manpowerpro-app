import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity as ActivityIcon,
  ArrowRightCircle,
  Building2,
  Handshake,
  HeartHandshake,
  History,
  ListChecks,
  Loader2,
  PencilLine,
  Receipt,
  Send,
  Settings,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { relativeTime } from "@/lib/format";

const ACTION_ICONS: Record<string, typeof ActivityIcon> = {
  stage_advanced: ArrowRightCircle,
  candidate_created: UserPlus,
  candidate_updated: PencilLine,
  communication_sent: Send,
  fee_created: Wallet,
  fee_paid: Wallet,
  expense_created: Receipt,
  task_created: ListChecks,
  task_updated: ListChecks,
  client_created: Building2,
  partner_created: Handshake,
  aftercare: HeartHandshake,
  agency_updated: Settings,
  team_added: Settings,
  team_updated: Settings,
};

function actionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function ActionIcon({ action }: { action: string }) {
  const key = Object.keys(ACTION_ICONS).find((k) => action.startsWith(k));
  const Icon = key ? ACTION_ICONS[key] : ActivityIcon;
  return <Icon className="size-4" strokeWidth={1.75} />;
}

export default function Activity() {
  const [actor, setActor] = useState("all");
  const [action, setAction] = useState("all");

  const data = useQuery(api.activity.list, {
    actorId: actor === "all" ? undefined : (actor as Id<"users">),
    action: action === "all" ? undefined : action,
  });

  const summary = data?.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Activity</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Office audit trail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every change, stage advance and send across the desks — who did what,
          and when. Every candidate mutation writes to this feed automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <History className="size-3.5" /> Entries
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.total : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Logged office actions
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> Team members
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.actors : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Distinct actors</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <ActivityIcon className="size-3.5" /> Top action
          </p>
          <p className="font-display mt-1 text-lg leading-8">
            {summary?.topAction ? actionLabel(summary.topAction) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Most frequent</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select
            value={actor}
            onValueChange={(value) => setActor(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team members</SelectItem>
              {data?.actors.map((a) => (
                <SelectItem key={a.userId} value={a.userId}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-56">
          <Select
            value={action}
            onValueChange={(value) => setAction(value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {data?.actions.map((a) => (
                <SelectItem key={a.action} value={a.action}>
                  {actionLabel(a.action)} ({a.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(actor !== "all" || action !== "all") && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setActor("all");
              setAction("all");
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : data.rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center">
          <History className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No activity found</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Nothing matches these filters yet.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/80">
          <div className="divide-y divide-border/50">
            {data.rows.map((row) => (
              <div
                key={row._id}
                className="flex items-start gap-3.5 px-4 py-3.5"
              >
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-muted-foreground">
                  <ActionIcon action={row.action} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">
                    <span className="font-medium">{row.actorName ?? "System"}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      <span className="font-medium text-foreground">
                        {actionLabel(row.action)}
                      </span>
                    </span>
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {row.description}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[11px]">
                      {relativeTime(row.createdAt)}
                    </Badge>
                    {row.candidateName && row.candidateId && (
                      <Link
                        to={`/app/candidates/${row.candidateId}`}
                        className="text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      >
                        {row.candidateName}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
