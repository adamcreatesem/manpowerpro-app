import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Loader2, Trash2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type ItemStatus = "pending" | "uploaded" | "verified" | "rejected";

export default function Documents() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = useQuery(api.documents.readiness, {});
  const upsert = useMutation(api.documents.upsert);
  const remove = useMutation(api.documents.remove);

  const rows = useMemo(() => {
    const all = data?.candidates ?? [];
    if (filter === "ready") return all.filter((r) => r.readyToProcess && r.stage !== "Exited");
    if (filter === "missing") return all.filter((r) => !r.readyToProcess && r.stage !== "Exited");
    if (filter === "exited") return all.filter((r) => r.stage === "Exited");
    return all;
  }, [data, filter]);

  const selected =
    data?.candidates.find((c) => c._id === selectedId) ??
    (rows[0] ? rows[0] : null);

  const handleVerify = async (
    candidateId: Id<"candidates">,
    item: { key: string; label: string; docId: string | null },
  ) => {
    try {
      await upsert({
        ...(item.docId ? { id: item.docId as Id<"documents"> } : {}),
        candidateId,
        type: item.key,
        name: item.label,
        status: "verified",
      });
      toast(`${item.label} verified`);
    } catch {
      toast("Could not update document");
    }
  };

  const handleCollect = async (
    candidateId: Id<"candidates">,
    item: { key: string; label: string; docId: string | null },
  ) => {
    try {
      await upsert({
        ...(item.docId ? { id: item.docId as Id<"documents"> } : {}),
        candidateId,
        type: item.key,
        name: item.label,
        status: "uploaded",
      });
      toast(`${item.label} logged as collected`);
    } catch {
      toast("Could not log document");
    }
  };

  const handleRemove = async (id: Id<"documents">) => {
    try {
      await remove({ id });
      toast("Document removed from file");
    } catch {
      toast("Could not remove document");
    }
  };

  const statusBadge = (status: ItemStatus) => {
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Verified
        </span>
      );
    }
    if (status === "uploaded") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          <Circle className="size-3.5" />
          Collected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
        <Circle className="size-3.5" />
        Pending
      </span>
    );
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
          <p className="text-label">Files</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Documents
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The readiness gate — every file's checklist before it moves into the
            pipeline.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Ready to process
          </p>
          <p className="font-display mt-1 text-2xl">
            {data ? data.summary.ready : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Core documents complete
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Needs documents
          </p>
          <p className="font-display mt-1 text-2xl">
            {data ? data.summary.notReady : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Missing core papers
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Exited
          </p>
          <p className="font-display mt-1 text-2xl">
            {data ? data.summary.exited : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Withdrawn, canceled or deleted
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "All"],
          ["ready", "Ready to process"],
          ["missing", "Needs documents"],
          ["exited", "Exited"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setSelectedId(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === key
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Candidate readiness list */}
          <div className="divide-y divide-border/70 border-y border-border/70">
            {rows.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No candidates in this view.
              </p>
            )}
            {rows.map((r) => {
              const pct = Math.round((r.collected / r.total) * 100);
              const exited = r.stage === "Exited";
              return (
                <button
                  key={r._id}
                  type="button"
                  onClick={() => setSelectedId(r._id)}
                  className={`block w-full cursor-pointer px-1 py-3 text-left transition-colors hover:bg-accent/40 ${
                    selected?._id === r._id ? "bg-accent/40" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">
                        {r.firstName} {r.lastName}
                        <span className="ml-2 text-muted-foreground">
                          {r.passportNumber ?? "—"}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {r.stage}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {exited ? (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Exited
                        </span>
                      ) : r.readyToProcess ? (
                        <span className="rounded-full border border-foreground bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-background">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {r.coreCollected}/{r.coreTotal} core
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-border/60">
                      <div
                        className={`h-full rounded-full ${
                          exited
                            ? "bg-border"
                            : r.readyToProcess
                              ? "bg-foreground"
                              : "bg-foreground/50"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {r.collected}/{r.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected candidate's checklist */}
          {selected && (
            <div className="rounded-lg border border-border/70 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-normal tracking-tight">
                    <Link
                      to={`/app/candidates/${selected._id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {selected.firstName} {selected.lastName}
                    </Link>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selected.passportNumber ?? "—"} · {selected.stage}
                  </p>
                </div>
                {selected.readyToProcess && selected.stage !== "Exited" ? (
                  <span className="rounded-full border border-foreground bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-background">
                    Ready to process
                  </span>
                ) : (
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {selected.stage === "Exited" ? "Exited" : "Needs documents"}
                  </span>
                )}
              </div>

              <div className="mt-5 divide-y divide-border/70">
                {selected.items.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium">
                        {item.label}
                        {item.requiredForEntry && (
                          <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                            required
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {item.hint ?? "Not on record yet"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {statusBadge(item.status)}
                      {item.status !== "verified" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          onClick={() =>
                            item.docId
                              ? handleVerify(selected._id, item)
                              : handleCollect(selected._id, item)
                          }
                        >
                          {item.docId ? "Verify" : "Mark collected"}
                        </Button>
                      )}
                      {item.docId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          onClick={() => handleRemove(item.docId as Id<"documents">)}
                          aria-label={`Remove ${item.label}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!selected.readyToProcess && selected.stage !== "Exited" && (
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {selected.coreCollected}/{selected.coreTotal} core documents
                  collected — the file can enter the pipeline once passport,
                  photos, certificates and the admission form are verified.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
