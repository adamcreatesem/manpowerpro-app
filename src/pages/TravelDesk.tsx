import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  GraduationCap,
  Loader2,
  Plane,
  Stamp,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type SheetVisa =
  | "PROCESSING"
  | "TASHEER"
  | "EMBASSY"
  | "RETURNED FROM EMBASSY"
  | "VISA ISSUED"
  | "EXPIRED"
  | "REJECTED"
  | "REQUEST CANCELATION"
  | "VISA CANCELED";

type VisaAppStatus = "draft" | "submitted" | "processing" | "approved" | "issued" | "rejected";
type BioStatus = "pending" | "submitted" | "completed";
type DepartureStatus = "scheduled" | "confirmed" | "departed";
type TrainingStatus = "attended" | "passed" | "failed" | "retest";

interface VisaRow {
  _id: Id<"candidates">;
  firstName: string;
  lastName: string;
  passportNumber?: string;
  occupation?: string;
  pro?: string;
  visaStatus?: string;
  tasheerAppointmentDate?: string;
  derivedStage: string;
  daysInStage: number;
  stuck: boolean;
  stuckOwner: string | null;
  expiring: boolean;
  nextStep: { next: string; label: string } | null;
  app: {
    _id: Id<"visaApplications">;
    status?: string;
    mofaRefNumber?: string;
    biometricStatus?: string;
    tasheerAppointmentId?: string;
    visaNumber?: string;
    visaIssueDate?: string;
    expiryDate?: string;
    embassyName?: string;
    embassyReference?: string;
    rejectionReason?: string;
    notes?: string;
  } | null;
}

interface DepartureRow {
  _id: Id<"departures">;
  candidateId: Id<"candidates">;
  candidateName: string;
  passportNumber?: string;
  occupation?: string;
  pro?: string;
  flightNumber?: string;
  departureDate?: number;
  destination?: string;
  status: string;
}

interface TrainingRow {
  _id: Id<"trainingCertifications">;
  candidateId: Id<"candidates">;
  candidateName: string;
  passportNumber?: string;
  courseName?: string;
  centerName?: string;
  startDate?: string;
  endDate?: string;
  totalHours?: number;
  status?: string;
  certificateNumber?: string;
  certificateIssueDate?: string;
}

const VISA_BADGE: Record<string, { label: string; className: string }> = {
  PROCESSING: { label: "Processing", className: "" },
  TASHEER: { label: "Tasheer", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  EMBASSY: { label: "At embassy", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
  "RETURNED FROM EMBASSY": { label: "Returned from embassy", className: "" },
  "VISA ISSUED": { label: "Issued", className: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400" },
  EXPIRED: { label: "Expired", className: "border-destructive/40 text-destructive" },
  REJECTED: { label: "Rejected", className: "border-destructive/40 text-destructive" },
  "REQUEST CANCELATION": { label: "Cancel requested", className: "border-destructive/40 text-destructive" },
  "VISA CANCELED": { label: "Canceled", className: "border-destructive/40 text-destructive" },
};

const DEPARTURE_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "" },
  confirmed: { label: "Confirmed", className: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400" },
  departed: { label: "Departed", className: "border-foreground bg-foreground text-background" },
};

const TRAINING_BADGE: Record<string, { label: string; className: string }> = {
  attended: { label: "Attended", className: "" },
  passed: { label: "Passed", className: "border-emerald-600/40 text-emerald-700 dark:text-emerald-400" },
  failed: { label: "Failed", className: "border-destructive/40 text-destructive" },
  retest: { label: "Retest", className: "border-amber-500/40 text-amber-600 dark:text-amber-400" },
};

const isoInput = (ts: number | undefined | null) =>
  ts ? new Date(ts).toISOString().slice(0, 10) : "";

export default function TravelDesk() {
  const [tab, setTab] = useState("visa");
  const [visaTarget, setVisaTarget] = useState<VisaRow | null>(null);
  const [flightTarget, setFlightTarget] = useState<{
    candidateId: Id<"candidates">;
    candidateName: string;
    current?: DepartureRow;
  } | null>(null);
  const [trainingTarget, setTrainingTarget] = useState<{
    candidateId: Id<"candidates">;
    candidateName: string;
    current?: TrainingRow;
  } | null>(null);

  const visa = useQuery(api.travel.visaDesk, {});
  const travel = useQuery(api.travel.travelDesk, {});
  const updateCandidate = useMutation(api.candidates.update);

  const handleQuick = async (row: VisaRow) => {
    if (!row.nextStep) return;
    try {
      await updateCandidate({
        id: row._id,
        patch: { visaStatus: row.nextStep.next as SheetVisa },
      });
      toast(`${row.firstName} ${row.lastName} — ${row.nextStep.label}`);
    } catch (err) {
      toast("Could not update visa status", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const summary = visa?.summary;
  const tSummary = travel?.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <p className="text-label">Desk · Document Control</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Visa & travel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The filing room — visa applications through the embassy, then
          pre-departure training and flights.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Stamp className="size-3.5" /> In flight
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.inFlight : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tasheer · embassy
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Processing
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.processing : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Application filed</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Issued
          </p>
          <p className="font-display mt-1 text-2xl">
            {summary ? summary.issued : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary ? `${summary.expiring} expiring ≤30d` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Plane className="size-3.5" /> Booked
          </p>
          <p className="font-display mt-1 text-2xl">
            {tSummary ? tSummary.flightsBooked : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tSummary ? `${tSummary.needsFlight} waiting for a flight` : ""}
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <GraduationCap className="size-3.5" /> Training
          </p>
          <p className="font-display mt-1 text-2xl">
            {tSummary ? `${tSummary.trainingPassed} / ${tSummary.trainingPassed + tSummary.trainingPending}` : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tSummary ? `${tSummary.departed} departed` : ""}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="visa">Visa worklist</TabsTrigger>
          <TabsTrigger value="travel">Travel & training</TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------ */}
        {/* Visa worklist                                                 */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="visa" className="space-y-4">
          {!visa ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : visa.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No files in the visa stages right now.
            </p>
          ) : (
            <div className="divide-y divide-border/70 border-y border-border/70">
              {visa.rows.map((row) => {
                const badge = VISA_BADGE[row.visaStatus ?? ""] ?? {
                  label: row.visaStatus ?? "—",
                  className: "",
                };
                return (
                  <div
                    key={row._id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70">
                        <Stamp className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">
                          <Link
                            to={`/app/candidates/${row._id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {row.firstName} {row.lastName}
                          </Link>
                          <span className="ml-2 text-muted-foreground">
                            {row.passportNumber ?? ""}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.occupation ?? "Worker"}
                          {row.pro && <> · via {row.pro}</>}
                          {" · "}
                          {row.daysInStage}d in stage
                          {row.tasheerAppointmentDate && (
                            <>
                              {" · "}Tasheer {row.tasheerAppointmentDate}
                            </>
                          )}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          {row.app?.mofaRefNumber && (
                            <span>MOFA {row.app.mofaRefNumber}</span>
                          )}
                          {row.app?.visaNumber && <span>Visa {row.app.visaNumber}</span>}
                          {row.app?.expiryDate && (
                            <span>Valid until {row.app.expiryDate}</span>
                          )}
                          {!row.app && (
                            <span className="text-muted-foreground/60">
                              No application record yet
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {row.stuck && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3" />
                          Stuck {row.stuckOwner ?? ""}
                        </span>
                      )}
                      {row.expiring && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          Expiring soon
                        </span>
                      )}
                      <Badge variant="outline" className={`font-normal ${badge.className}`}>
                        {badge.label}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisaTarget(row)}
                      >
                        Record
                      </Button>
                      {row.nextStep && (
                        <Button size="sm" onClick={() => handleQuick(row)}>
                          {row.nextStep.label}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------ */}
        {/* Travel & training                                             */}
        {/* ------------------------------------------------------------ */}
        <TabsContent value="travel" className="space-y-6">
          {!travel ? (
            <div className="flex min-h-[40vh] items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Gaps before departure */}
              {(travel.needsFlight.length > 0 || travel.needsTraining.length > 0) && (
                <div className="space-y-2">
                  <p className="text-label">Before they can fly</p>
                  {travel.needsFlight.map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">
                          <Link
                            to={`/app/candidates/${c._id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {c.firstName} {c.lastName}
                          </Link>
                          <span className="ml-2 text-muted-foreground">
                            {c.passportNumber ?? ""}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Visa issued{c.visaNumber ? ` · ${c.visaNumber}` : ""} —{" "}
                          flight not booked
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          setFlightTarget({
                            candidateId: c._id,
                            candidateName: `${c.firstName} ${c.lastName}`,
                          })
                        }
                      >
                        <Plane className="mr-1.5 size-3.5" /> Book flight
                      </Button>
                    </div>
                  ))}
                  {travel.needsTraining.map((c) => (
                    <div
                      key={c._id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium">
                          <Link
                            to={`/app/candidates/${c._id}`}
                            className="underline-offset-2 hover:underline"
                          >
                            {c.firstName} {c.lastName}
                          </Link>
                          <span className="ml-2 text-muted-foreground">
                            {c.passportNumber ?? ""}
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Flight {c.bookedFor ? `booked for ${c.bookedFor}` : "booked"} —{" "}
                          training {c.training ?? "not started"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          setTrainingTarget({
                            candidateId: c._id,
                            candidateName: `${c.firstName} ${c.lastName}`,
                          })
                        }
                      >
                        <GraduationCap className="mr-1.5 size-3.5" /> Record training
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Departures */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-label">Flights</p>
                    <span className="text-[11px] text-muted-foreground">
                      {travel.departures.length} records
                    </span>
                  </div>
                  {travel.departures.length === 0 ? (
                    <p className="border-y border-border/70 py-8 text-center text-sm text-muted-foreground">
                      No flights on record.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      {travel.departures.map((d) => {
                        const b = DEPARTURE_BADGE[d.status] ?? {
                          label: d.status,
                          className: "",
                        };
                        return (
                          <div
                            key={d._id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium">
                                {d.flightNumber ?? "—"}{" "}
                                <span className="text-muted-foreground">
                                  → {d.destination ?? "Saudi Arabia"}
                                </span>
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {d.candidateName}
                                {d.passportNumber ? ` · ${d.passportNumber}` : ""}
                                {d.departureDate
                                  ? ` · ${new Date(d.departureDate).toLocaleDateString("en-GB")}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`font-normal ${b.className}`}>
                                {b.label}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setFlightTarget({
                                    candidateId: d.candidateId,
                                    candidateName: d.candidateName,
                                    current: d,
                                  })
                                }
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Training */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-label">Training</p>
                    <span className="text-[11px] text-muted-foreground">
                      {travel.training.length} certificates
                    </span>
                  </div>
                  {travel.training.length === 0 ? (
                    <p className="border-y border-border/70 py-8 text-center text-sm text-muted-foreground">
                      No training on record.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/70 border-y border-border/70">
                      {travel.training.map((t) => {
                        const b = TRAINING_BADGE[t.status ?? ""] ?? {
                          label: t.status ?? "—",
                          className: "",
                        };
                        return (
                          <div
                            key={t._id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium">
                                {t.courseName ?? "Pre-departure training"}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {t.candidateName}
                                {t.passportNumber ? ` · ${t.passportNumber}` : ""}
                                {t.certificateNumber
                                  ? ` · ${t.certificateNumber}`
                                  : ""}
                                {t.endDate ? ` · ${t.endDate}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`font-normal ${b.className}`}>
                                {b.label}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setTrainingTarget({
                                    candidateId: t.candidateId,
                                    candidateName: t.candidateName,
                                    current: t,
                                  })
                                }
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Visa record dialog */}
      <VisaRecordDialog
        row={visaTarget}
        onClose={() => setVisaTarget(null)}
      />

      {/* Flight dialog */}
      <FlightDialog target={flightTarget} onClose={() => setFlightTarget(null)} />

      {/* Training dialog */}
      <TrainingDialog
        target={trainingTarget}
        onClose={() => setTrainingTarget(null)}
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Visa record dialog                                                          */
/* -------------------------------------------------------------------------- */

function VisaRecordDialog({ row, onClose }: { row: VisaRow | null; onClose: () => void }) {
  const save = useMutation(api.travel.saveVisaApp);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    status: "",
    mofaRefNumber: "",
    biometricStatus: "",
    tasheerAppointmentId: "",
    visaNumber: "",
    visaIssueDate: "",
    expiryDate: "",
    embassyName: "",
    embassyReference: "",
    rejectionReason: "",
    notes: "",
  });

  const open = row !== null;
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    const a = row?.app;
    setForm({
      status: a?.status ?? "",
      mofaRefNumber: a?.mofaRefNumber ?? "",
      biometricStatus: a?.biometricStatus ?? "",
      tasheerAppointmentId: a?.tasheerAppointmentId ?? "",
      visaNumber: a?.visaNumber ?? "",
      visaIssueDate: a?.visaIssueDate ?? "",
      expiryDate: a?.expiryDate ?? "",
      embassyName: a?.embassyName ?? "",
      embassyReference: a?.embassyReference ?? "",
      rejectionReason: a?.rejectionReason ?? "",
      notes: a?.notes ?? "",
    });
    setWasOpen(true);
  }
  if (!open && wasOpen) setWasOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;
    setSaving(true);
    try {
      await save({
        candidateId: row._id,
        status: (form.status || undefined) as VisaAppStatus | undefined,
        mofaRefNumber: form.mofaRefNumber || undefined,
        biometricStatus: (form.biometricStatus || undefined) as BioStatus | undefined,
        tasheerAppointmentId: form.tasheerAppointmentId || undefined,
        visaNumber: form.visaNumber || undefined,
        visaIssueDate: form.visaIssueDate || undefined,
        expiryDate: form.expiryDate || undefined,
        embassyName: form.embassyName || undefined,
        embassyReference: form.embassyReference || undefined,
        rejectionReason: form.rejectionReason || undefined,
        notes: form.notes || undefined,
      });
      toast("Visa record saved");
      onClose();
    } catch (err) {
      toast("Could not save visa record", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Visa application record</DialogTitle>
          <DialogDescription>
            {row ? `${row.firstName} ${row.lastName} · ${row.passportNumber ?? "no passport"}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Draft" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["draft", "Draft"],
                    ["submitted", "Submitted"],
                    ["processing", "Processing"],
                    ["approved", "Approved"],
                    ["issued", "Issued"],
                    ["rejected", "Rejected"],
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Biometrics</Label>
              <Select
                value={form.biometricStatus}
                onValueChange={(v) => setForm({ ...form, biometricStatus: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["pending", "Pending"],
                    ["submitted", "Submitted"],
                    ["completed", "Completed"],
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>MOFA reference</Label>
              <Input
                value={form.mofaRefNumber}
                onChange={(e) => setForm({ ...form, mofaRefNumber: e.target.value })}
                placeholder="MOFA-2026-…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tasheer appointment ID</Label>
              <Input
                value={form.tasheerAppointmentId}
                onChange={(e) => setForm({ ...form, tasheerAppointmentId: e.target.value })}
                placeholder="TSH-AD-…"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Visa number</Label>
              <Input
                value={form.visaNumber}
                onChange={(e) => setForm({ ...form, visaNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Issue date</Label>
              <Input
                type="date"
                value={form.visaIssueDate}
                onChange={(e) => setForm({ ...form, visaIssueDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Embassy</Label>
              <Input
                value={form.embassyName}
                onChange={(e) => setForm({ ...form, embassyName: e.target.value })}
                placeholder="Saudi Embassy Addis Ababa"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Embassy reference</Label>
              <Input
                value={form.embassyReference}
                onChange={(e) => setForm({ ...form, embassyReference: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Rejection reason</Label>
            <Textarea
              value={form.rejectionReason}
              onChange={(e) => setForm({ ...form, rejectionReason: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Flight dialog                                                               */
/* -------------------------------------------------------------------------- */

function FlightDialog({
  target,
  onClose,
}: {
  target: { candidateId: Id<"candidates">; candidateName: string; current?: DepartureRow } | null;
  onClose: () => void;
}) {
  const save = useMutation(api.travel.saveDeparture);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    flightNumber: "",
    departureDate: "",
    destination: "Riyadh",
    status: "confirmed",
  });

  const open = target !== null;
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    const d = target?.current;
    setForm({
      flightNumber: d?.flightNumber ?? "",
      departureDate: isoInput(d?.departureDate),
      destination: d?.destination ?? "Riyadh",
      status: d?.status ?? "confirmed",
    });
    setWasOpen(true);
  }
  if (!open && wasOpen) setWasOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      const ts = form.departureDate
        ? new Date(`${form.departureDate}T00:00:00`).getTime()
        : undefined;
      await save({
        candidateId: target.candidateId,
        flightNumber: form.flightNumber || undefined,
        departureDate: ts,
        destination: form.destination || undefined,
        status: form.status as DepartureStatus,
      });
      toast(form.status === "departed" ? "Departure recorded" : "Flight booked");
      onClose();
    } catch (err) {
      toast("Could not save flight", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Flight</DialogTitle>
          <DialogDescription>{target?.candidateName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Flight number</Label>
              <Input
                value={form.flightNumber}
                onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
                placeholder="ET 480"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Departure date</Label>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["scheduled", "Scheduled"],
                    ["confirmed", "Confirmed"],
                    ["departed", "Departed"],
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save flight
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/* Training dialog                                                             */
/* -------------------------------------------------------------------------- */

function TrainingDialog({
  target,
  onClose,
}: {
  target: { candidateId: Id<"candidates">; candidateName: string; current?: TrainingRow } | null;
  onClose: () => void;
}) {
  const save = useMutation(api.travel.saveTraining);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    courseName: "Pre-Departure Orientation",
    centerName: "",
    startDate: "",
    endDate: "",
    totalHours: "",
    status: "passed",
    certificateNumber: "",
    certificateIssueDate: "",
  });

  const open = target !== null;
  const [wasOpen, setWasOpen] = useState(false);
  if (open && !wasOpen) {
    const t = target?.current;
    setForm({
      courseName: t?.courseName ?? "Pre-Departure Orientation",
      centerName: t?.centerName ?? "",
      startDate: t?.startDate ?? "",
      endDate: t?.endDate ?? "",
      totalHours: t?.totalHours != null ? String(t.totalHours) : "",
      status: t?.status ?? "passed",
      certificateNumber: t?.certificateNumber ?? "",
      certificateIssueDate: t?.certificateIssueDate ?? "",
    });
    setWasOpen(true);
  }
  if (!open && wasOpen) setWasOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await save({
        candidateId: target.candidateId,
        courseName: form.courseName || undefined,
        centerName: form.centerName || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        totalHours: form.totalHours ? Number(form.totalHours) : undefined,
        status: form.status as TrainingStatus,
        certificateNumber: form.certificateNumber || undefined,
        certificateIssueDate: form.certificateIssueDate || undefined,
      });
      toast("Training record saved");
      onClose();
    } catch (err) {
      toast("Could not save training", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Training certification</DialogTitle>
          <DialogDescription>{target?.candidateName}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="space-y-1.5">
            <Label>Course</Label>
            <Input
              value={form.courseName}
              onChange={(e) => setForm({ ...form, courseName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Training centre</Label>
              <Input
                value={form.centerName}
                onChange={(e) => setForm({ ...form, centerName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Result</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ["attended", "Attended"],
                    ["passed", "Passed"],
                    ["failed", "Failed"],
                    ["retest", "Retest"],
                  ].map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hours</Label>
              <Input
                type="number"
                min={1}
                value={form.totalHours}
                onChange={(e) => setForm({ ...form, totalHours: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Certificate number</Label>
              <Input
                value={form.certificateNumber}
                onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Certificate date</Label>
              <Input
                type="date"
                value={form.certificateIssueDate}
                onChange={(e) => setForm({ ...form, certificateIssueDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save training
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
