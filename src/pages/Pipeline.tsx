import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PIPELINE_STAGES, STAGE_META, nextStage } from "@/lib/stages";
import { daysInStage, initials } from "@/lib/format";
import { ArrowRight, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Pipeline() {
  const navigate = useNavigate();
  const [advancing, setAdvancing] = useState<string | null>(null);
  const rows = useQuery(api.candidates.list, {});
  const advance = useMutation(api.candidates.advanceStage);

  const byStage = new Map<string, NonNullable<typeof rows>>();
  for (const stage of PIPELINE_STAGES) {
    byStage.set(stage, (rows ?? []).filter((c) => c.derivedStage === stage));
  }

  const handleAdvance = async (id: Id<"candidates">, name: string) => {
    setAdvancing(id);
    try {
      const res = await advance({ id });
      if (res.advanced) {
        toast("File moved", { description: `${name} → ${res.next}` });
      } else {
        toast(res.message ?? "Cannot advance further");
      }
    } catch (err) {
      toast("Could not advance", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAdvancing(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Desks</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The file moves desk to desk, in this order. Advancing applies the
          next step and logs who did it.
        </p>
      </div>

      {!rows ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="-mx-5 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
          <div className="flex min-w-max gap-4">
            {PIPELINE_STAGES.map((stage, i) => {
              const items = byStage.get(stage) ?? [];
              const meta = STAGE_META[stage];
              return (
                <div key={stage} className="w-72 shrink-0">
                  <div className="mb-3 flex items-baseline justify-between gap-2 border-b border-border/80 pb-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold tracking-tight">
                        <span className="tabular mr-1.5 text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {stage}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {meta.desk}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {items.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {items.length === 0 && (
                      <p className="px-1 text-xs text-muted-foreground/70">
                        Empty
                      </p>
                    )}
                    {items.map((c) => {
                      const next = nextStage(c.derivedStage);
                      const canAdvance = !!next;
                      return (
                        <div
                          key={c._id}
                          className="group rounded-md border border-border/80 bg-card p-3.5 transition-colors hover:border-border"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/app/candidates/${c._id}`)
                            }
                            className="block w-full cursor-pointer text-left"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium">
                                  {initials(
                                    `${c.firstName ?? ""} ${c.lastName ?? ""}`,
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-medium">
                                    {c.firstName} {c.lastName}
                                  </p>
                                  <p className="truncate text-[11px] text-muted-foreground">
                                    {c.passportNumber ?? "—"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <span className="truncate">
                                {c.employerName ?? "No employer yet"}
                              </span>
                              <span className="tabular shrink-0">
                                {daysInStage(c.stageEnteredAt)}d
                                {c.openTasks > 0
                                  ? ` · ${c.openTasks} task`
                                  : ""}
                              </span>
                            </div>
                          </button>
                          {canAdvance && (
                            <button
                              type="button"
                              onClick={() =>
                                handleAdvance(
                                  c._id,
                                  `${c.firstName} ${c.lastName}`,
                                )
                              }
                              disabled={advancing === c._id}
                              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-60"
                            >
                              {advancing === c._id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <ArrowRight className="size-3" />
                              )}
                              Move to {next}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
