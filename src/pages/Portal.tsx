// Candidate self-service portal: sign in with passport number + PIN to track
// a file as it moves through the pipeline.
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { PIPELINE_STAGES } from "@/lib/stages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Check,
  CircleDashed,
  Loader2,
  LockKeyhole,
  Search,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

function Step({ status }: { status: "done" | "current" | "upcoming" }) {
  if (status === "done") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <Check className="size-3" strokeWidth={2.5} />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-foreground">
        <span className="size-1.5 rounded-full bg-foreground" />
      </span>
    );
  }
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border">
      <CircleDashed className="size-3 text-muted-foreground/60" />
    </span>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-2.5 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-[13px] font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export default function Portal() {
  const [passport, setPassport] = useState("");
  const [pin, setPin] = useState("");
  const [loggedInId, setLoggedInId] = useState<Id<"candidates"> | null>(null);
  const [busy, setBusy] = useState(false);

  const login = useMutation(api.candidatePortal.login);
  const status = useQuery(
    api.candidatePortal.status,
    loggedInId ? { candidateId: loggedInId } : "skip",
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passport.trim() || pin.length !== 6) {
      toast("Enter your passport number and 6-digit PIN");
      return;
    }
    setBusy(true);
    try {
      const res = await login({ passportNumber: passport, pin });
      setLoggedInId(res.candidateId);
      toast(`Welcome, ${res.firstName}`);
    } catch (err) {
      toast("Could not sign in", {
        description:
          err instanceof Error
            ? err.message
            : "Check your details and try again",
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setLoggedInId(null);
    setPassport("");
    setPin("");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-[5px] bg-foreground text-background">
              <span className="font-display text-[13px] font-medium leading-none">
                M
              </span>
            </div>
            <span className="text-[15px] font-semibold tracking-tight">
              ManpowerPro
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 py-16 sm:px-8 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-label">Candidate portal</p>
          <h1 className="font-display mt-2 text-3xl font-normal tracking-tight sm:text-4xl">
            Track your file
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Sign in with the passport number and PIN you were given when your
            file was opened. You can follow your application as it moves
            through the office.
          </p>

          {!loggedInId ? (
            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-lg border border-border/80 bg-card p-6"
            >
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="p-passport">Passport number</Label>
                  <Input
                    id="p-passport"
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    placeholder="e.g. EP1000029"
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="uppercase"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-pin">6-digit PIN</Label>
                  <Input
                    id="p-pin"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="••••••"
                    inputMode="numeric"
                    maxLength={6}
                    type="password"
                    className="tabular"
                    disabled={busy}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <LockKeyhole className="mr-2 size-4" />
                  )}
                  Check my file
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  Demo file: passport <span className="tabular">EP1000029</span>
                  {" · PIN "}
                  <span className="tabular">123456</span>
                </p>
              </div>
            </form>
          ) : status === undefined ? (
            <div className="mt-8 flex min-h-[200px] items-center justify-center rounded-lg border border-border/80">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : status === null ? (
            <div className="mt-8 rounded-lg border border-border/80 bg-card p-8 text-center">
              <p className="text-sm font-medium">File not found</p>
              <Button variant="outline" className="mt-4" onClick={reset}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {/* Status card */}
              <div className="rounded-lg border border-border/80 bg-card p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[17px] font-semibold tracking-tight">
                      {status.firstName} {status.lastName}
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      <span className="tabular">{status.passportNumber}</span>
                      {" · "}
                      {status.department}
                    </p>
                  </div>
                  <span className="rounded-full border border-foreground px-3 py-1 text-[11px] font-medium">
                    {status.derivedStage}
                  </span>
                </div>

                {/* progress dots */}
                <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1">
                  {PIPELINE_STAGES.map((stage, i) => {
                    const idx = Math.max(
                      0,
                      (PIPELINE_STAGES as readonly string[]).indexOf(
                        status.derivedStage,
                      ),
                    );
                    const s =
                      i < idx
                        ? ("done" as const)
                        : i === idx
                          ? ("current" as const)
                          : ("upcoming" as const);
                    return (
                      <div
                        key={stage}
                        className="flex shrink-0 items-center gap-1"
                      >
                        <Step status={s} />
                        {i < PIPELINE_STAGES.length - 1 && (
                          <span
                            className={`h-px w-4 ${
                              i < idx ? "bg-foreground" : "bg-border"
                            }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {status.stuck.stuck && (
                  <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    This file has been in {status.derivedStage} for{" "}
                    {status.stuck.daysInStage} days. Ask the agency office what
                    is happening.
                  </p>
                )}
                {!status.stuck.stuck && status.stuck.daysInStage > 0 && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    {status.stuck.daysInStage} days in the current stage.
                  </p>
                )}
              </div>

              {/* Sheet values */}
              <div className="rounded-lg border border-border/80 bg-card p-6">
                <p className="text-label">Your file</p>
                <dl className="mt-2">
                  <Row label="Musaned" value={status.musStat} />
                  <Row label="Medical" value={status.medical} />
                  <Row label="Wakalah" value={status.wakalah} />
                  <Row label="Visa" value={status.visaStatus} />
                  <Row label="Training" value={status.training} />
                  <Row label="Booked for" value={status.bookedFor} />
                  <Row label="Flight" value={status.flightStat} />
                  <Row label="Sponsor (PRO)" value={status.pro} />
                </dl>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground">
                  Questions? Call the office on the number you were given.
                </p>
                <Button variant="outline" size="sm" onClick={reset}>
                  <Search className="mr-1.5 size-3.5" />
                  Check another file
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
