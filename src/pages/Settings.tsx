import { api } from "@/convex/_generated/api";
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
import {
  Building2,
  CreditCard,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { fmtDate } from "@/lib/format";
import { initials } from "@/lib/format";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  agency_owner: "Agency owner",
  agency_manager: "Agency manager",
  agency_staff: "Agency staff",
  client: "Client",
};

const OFFICE_ROLES = [
  { value: "agency_owner", label: "Agency owner" },
  { value: "agency_manager", label: "Agency manager" },
  { value: "agency_staff", label: "Agency staff" },
] as const;

type Profile = NonNullable<
  ReturnType<typeof useQuery<typeof api.admin.profile>>
>;

function LicenseStatus({
  days,
}: {
  days: number | null;
}) {
  if (days === null) {
    return (
      <span className="text-xs text-muted-foreground">
        No expiry recorded
      </span>
    );
  }
  if (days < 0) {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Expired {Math.abs(days)}d ago — renew before files are blocked
      </span>
    );
  }
  if (days <= 60) {
    return (
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Expires in {days} days
      </span>
    );
  }
  return (
    <span className="text-xs text-muted-foreground">
      Valid — expires in {days} days
    </span>
  );
}

export default function Settings() {
  const profile = useQuery(api.admin.profile);
  const team = useQuery(api.admin.team);

  const updateAgency = useMutation(api.admin.updateAgency);
  const addTeamMember = useMutation(api.admin.addTeamMember);
  const updateTeamMember = useMutation(api.admin.updateTeamMember);

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
    phone: "",
    website: "",
    contactEmail: "",
    licenseNumber: "",
    licenseExpiry: "",
    bankGuarantee: "",
    molsRegistrationNumber: "",
    molsRegistrationDate: "",
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addBusy, setAddBusy] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    role: "agency_staff" as (typeof OFFICE_ROLES)[number]["value"],
  });

  const [editMember, setEditMember] = useState<{
    userId: string;
    name: string;
    role: string;
    isActive: boolean;
  } | null>(null);
  const [memberBusy, setMemberBusy] = useState(false);

  const canManage =
    profile?.viewer.role === "agency_owner" ||
    profile?.viewer.role === "agency_manager" ||
    profile?.viewer.role === "super_admin";

  const openEdit = () => {
    if (!profile) return;
    setEditForm({
      name: profile.agency.name ?? "",
      address: profile.agency.address ?? "",
      phone: profile.agency.phone ?? "",
      website: profile.agency.website ?? "",
      contactEmail: profile.agency.contactEmail ?? "",
      licenseNumber: profile.agency.licenseNumber ?? "",
      licenseExpiry: profile.agency.licenseExpiry ?? "",
      bankGuarantee: profile.agency.bankGuarantee ?? "",
      molsRegistrationNumber: profile.agency.molsRegistrationNumber ?? "",
      molsRegistrationDate: profile.agency.molsRegistrationDate ?? "",
    });
    setEditOpen(true);
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setEditBusy(true);
    try {
      await updateAgency({
        name: editForm.name.trim() || undefined,
        address: editForm.address.trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        website: editForm.website.trim() || undefined,
        contactEmail: editForm.contactEmail.trim() || undefined,
        licenseNumber: editForm.licenseNumber.trim() || undefined,
        licenseExpiry: editForm.licenseExpiry || undefined,
        bankGuarantee: editForm.bankGuarantee.trim() || undefined,
        molsRegistrationNumber:
          editForm.molsRegistrationNumber.trim() || undefined,
        molsRegistrationDate: editForm.molsRegistrationDate || undefined,
      });
      setEditOpen(false);
      toast("Office profile updated");
    } catch (err) {
      toast("Could not update profile", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setEditBusy(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast("Name and email are required");
      return;
    }
    setAddBusy(true);
    try {
      await addTeamMember({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        role: addForm.role,
      });
      setAddOpen(false);
      setAddForm({ name: "", email: "", role: "agency_staff" });
      toast("Team member added");
    } catch (err) {
      toast("Could not add member", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAddBusy(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editMember) return;
    setMemberBusy(true);
    try {
      await updateTeamMember({
        userId: editMember.userId as never,
        name: editMember.name.trim() || undefined,
        role: editMember.role as never,
        isActive: editMember.isActive,
      });
      setEditMember(null);
      toast("Team member updated");
    } catch (err) {
      toast("Could not update member", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setMemberBusy(false);
    }
  };

  const usageRows = profile
    ? [
        {
          label: "Team seats",
          value: profile.usage.staff,
          limit: profile.subscription?.plan?.maxStaff ?? null,
        },
        {
          label: "Candidate files",
          value: profile.usage.candidates,
          limit: profile.subscription?.plan?.maxCandidates ?? null,
        },
        {
          label: "Employers",
          value: profile.usage.clients,
          limit: profile.subscription?.plan?.maxClients ?? null,
        },
      ]
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <p className="text-label">Settings</p>
        <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
          Office administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The office's regulatory identity, plan usage, and the team that runs
          the desks.
        </p>
      </div>

      {!profile ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------------------ */}
          {/* Office profile                                                      */}
          {/* ------------------------------------------------------------------ */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-label">Office profile</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  {profile.agency.name || "Unnamed agency"}
                </h2>
              </div>
              {canManage && (
                <Button variant="outline" onClick={openEdit}>
                  <Pencil className="mr-2 size-4" />
                  Edit profile
                </Button>
              )}
            </div>

            <div className="rounded-lg border border-border/80">
              <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-label">Office code</p>
                  <p className="mt-1 text-sm font-medium">
                    {profile.agency.code || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-label">Address</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    {profile.agency.address || "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-label">Phone</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="size-3.5" />
                    {profile.agency.phone || "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-label">Contact email</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.agency.contactEmail || "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-label">Website</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.agency.website || "Not recorded"}
                  </p>
                </div>
                <div>
                  <p className="text-label">Bank guarantee</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.agency.bankGuarantee || "Not recorded"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border/70 px-5 py-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Regulatory identity
                </p>
                <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-label">License number</p>
                    <p className="mt-1 text-sm font-medium">
                      {profile.agency.licenseNumber || "—"}
                    </p>
                    <LicenseStatus days={profile.agency.daysUntilLicenseExpiry} />
                  </div>
                  <div>
                    <p className="text-label">License expiry</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.agency.licenseExpiry || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-label">MOLS registration</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.agency.molsRegistrationNumber || "—"}
                      {profile.agency.molsRegistrationDate
                        ? ` · ${profile.agency.molsRegistrationDate}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* Subscription & usage                                                */}
          {/* ------------------------------------------------------------------ */}
          <section className="space-y-4">
            <div>
              <p className="text-label">Subscription</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">
                Plan & usage
              </h2>
            </div>

            <div className="rounded-lg border border-border/80">
              {profile.subscription?.plan ? (
                <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-xl">
                        {profile.subscription.plan.name}
                      </p>
                      <Badge variant="outline">
                        {profile.subscription.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {profile.subscription.plan.description}
                    </p>
                    <p className="mt-3 text-sm">
                      <span className="font-display text-lg">
                        ${profile.subscription.plan.priceMonthly}
                      </span>
                      <span className="text-muted-foreground"> / month</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {profile.subscription.currentPeriodEnd
                        ? `Current period ends ${fmtDate(profile.subscription.currentPeriodEnd)}`
                        : "Current period in effect"}
                    </p>
                  </div>

                  <div className="space-y-4 border-t border-border/70 pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                    <p className="text-label">Usage this period</p>
                    {usageRows.map((row) => {
                      const pct =
                        row.limit && row.limit > 0
                          ? Math.min(100, Math.round((row.value / row.limit) * 100))
                          : 0;
                      return (
                        <div key={row.label}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-sm text-muted-foreground">
                              {row.label}
                            </p>
                            <p className="text-sm">
                              <span className="font-display font-semibold">
                                {row.value}
                              </span>
                              {row.limit ? (
                                <span className="text-muted-foreground">
                                  {" "}
                                  / {row.limit}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {" "}
                                  (unlimited)
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-foreground transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {!profile.subscription.plan.maxStaff &&
                      !profile.subscription.plan.maxCandidates &&
                      !profile.subscription.plan.maxClients && (
                        <p className="text-xs text-muted-foreground">
                          This plan has no seat or file limits.
                        </p>
                      )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <CreditCard className="size-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      No subscription on file
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      The office runs on the default plan until a subscription
                      is attached.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* Team                                                                */}
          {/* ------------------------------------------------------------------ */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-label">Team</p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">
                  Desk staff
                </h2>
              </div>
              {canManage && (
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="mr-2 size-4" />
                  Add member
                </Button>
              )}
            </div>

            {!team ? (
              <div className="flex min-h-[30vh] items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : team.rows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border py-16 text-center">
                <Users className="mx-auto size-6 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">No team members yet</p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Add the first desk staff account to get the office running.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/80">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Member</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Assigned</th>
                      <th className="px-4 py-3 font-medium">Deployed</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                      <th className="px-4 py-3 font-medium">Open tasks</th>
                      {canManage && (
                        <th className="px-4 py-3 font-medium">
                          <span className="sr-only">Manage</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {team.rows.map((row) => (
                      <tr key={row.userId} className="align-middle">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/40">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {initials(row.name)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium">
                                {row.name}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {row.email ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">
                            {ROLE_LABELS[row.role] ?? row.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.isActive ? (
                            <span className="text-muted-foreground">Active</span>
                          ) : (
                            <span className="text-muted-foreground/60">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-display text-base">
                          {row.assigned}
                        </td>
                        <td className="px-4 py-3 font-display text-base">
                          {row.deployed}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.actions}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {row.openTasks}
                        </td>
                        {canManage && (
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setEditMember({
                                  userId: row.userId,
                                  name: row.name,
                                  role: row.role,
                                  isActive: row.isActive,
                                })
                              }
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Edit profile dialog                                             */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit office profile</DialogTitle>
            <DialogDescription>
              Contact details and regulatory identity for {profile?.agency.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditProfile} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-name">Office name</Label>
                <Input
                  id="e-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-email">Contact email</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={editForm.contactEmail}
                  onChange={(e) =>
                    setEditForm({ ...editForm, contactEmail: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-address">Address</Label>
              <Input
                id="e-address"
                value={editForm.address}
                onChange={(e) =>
                  setEditForm({ ...editForm, address: e.target.value })
                }
                placeholder="Bole Road, Addis Ababa"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">Phone</Label>
                <Input
                  id="e-phone"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                  placeholder="+251 11 000 0000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-website">Website</Label>
                <Input
                  id="e-website"
                  value={editForm.website}
                  onChange={(e) =>
                    setEditForm({ ...editForm, website: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="border-t border-border/70 pt-4">
              <p className="mb-3 text-label">Regulatory identity</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="e-license">License number</Label>
                  <Input
                    id="e-license"
                    value={editForm.licenseNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, licenseNumber: e.target.value })
                    }
                    placeholder="TAHLIA-2024-XXXXX"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-license-expiry">License expiry</Label>
                  <Input
                    id="e-license-expiry"
                    type="date"
                    value={editForm.licenseExpiry}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        licenseExpiry: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-mols">MOLS registration number</Label>
                  <Input
                    id="e-mols"
                    value={editForm.molsRegistrationNumber}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        molsRegistrationNumber: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="e-mols-date">MOLS registration date</Label>
                  <Input
                    id="e-mols-date"
                    type="date"
                    value={editForm.molsRegistrationDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        molsRegistrationDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="e-guarantee">Bank guarantee</Label>
                  <Input
                    id="e-guarantee"
                    value={editForm.bankGuarantee}
                    onChange={(e) =>
                      setEditForm({ ...editForm, bankGuarantee: e.target.value })
                    }
                    placeholder="Guarantee ref / amount"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editBusy}>
                {editBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Add member dialog                                               */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              A new desk staff account for this office. They sign in with this
              email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Full name</Label>
              <Input
                id="m-name"
                value={addForm.name}
                onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email</Label>
              <Input
                id="m-email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm({ ...addForm, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={addForm.role}
                onValueChange={(value) =>
                  setAddForm({
                    ...addForm,
                    role: value as (typeof OFFICE_ROLES)[number]["value"],
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFICE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addBusy}>
                {addBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* Edit member dialog                                              */}
      {/* ---------------------------------------------------------------- */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>
              Adjust the role or access for {editMember?.name}.
            </DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="em-name">Full name</Label>
                <Input
                  id="em-name"
                  value={editMember.name}
                  onChange={(e) =>
                    setEditMember({ ...editMember, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={editMember.role}
                  onValueChange={(value) =>
                    setEditMember({ ...editMember, role: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OFFICE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editMember.isActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setEditMember({
                      ...editMember,
                      isActive: value === "active",
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditMember(null)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={handleUpdateMember} disabled={memberBusy}>
                  {memberBusy && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
