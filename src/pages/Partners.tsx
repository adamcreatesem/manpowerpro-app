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
  Briefcase,
  Handshake,
  Loader2,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
  Users,
  Waypoints,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const initialForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  saudiLicenseNumber: "",
};

export default function Partners() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initialForm);

  const rows = useQuery(api.partners.list);
  const create = useMutation(api.partners.create);

  const totals = rows
    ? rows.reduce(
        (acc, p) => ({
          files: acc.files + p.files,
          deployed: acc.deployed + p.deployed,
          openOrders: acc.openOrders + p.openOrders,
        }),
        { files: 0, deployed: 0, openOrders: 0 },
      )
    : null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Partner name is required");
      return;
    }
    setBusy(true);
    try {
      await create({
        name: form.name.trim(),
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        saudiLicenseNumber: form.saudiLicenseNumber || undefined,
      });
      setOpen(false);
      setForm(initialForm);
      toast("Partner added");
    } catch (err) {
      toast("Could not add partner", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
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
          <p className="text-label">Saudi side</p>
          <h1 className="font-display mt-1 text-3xl font-normal tracking-tight">
            Partners
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The Saudi intermediaries (PROs) who handle wakalah, contracts and
            sponsorship on files placed through them.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add partner
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Handshake className="size-3.5" /> Partners
          </p>
          <p className="font-display mt-1 text-2xl">
            {rows ? rows.length : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Active intermediaries</p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Users className="size-3.5" /> Files via partners
          </p>
          <p className="font-display mt-1 text-2xl">
            {totals ? totals.files : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <Waypoints className="mr-0.5 inline size-3" />
            {totals ? totals.deployed : "—"} deployed
          </p>
        </div>
        <div className="rounded-lg border border-border/70 p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Briefcase className="size-3.5" /> Open orders
          </p>
          <p className="font-display mt-1 text-2xl">
            {totals ? totals.openOrders : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">In progress on their side</p>
        </div>
      </div>

      {!rows ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center">
          <Handshake className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No partners yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add the first Saudi intermediary to track the wakalah flow.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((p) => (
            <div
              key={p._id}
              className="rounded-md border border-border/80 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight">
                    {p.name}
                    <Badge variant="outline">{p.code}</Badge>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {p.country}
                    {p.contactPerson ? ` · ${p.contactPerson}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {p.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
                <div>
                  <p className="text-label">Files</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {p.files}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      ({p.activeFiles} active)
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-label">Deployed</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {p.deployed}
                  </p>
                </div>
                <div>
                  <p className="text-label">Orders</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {p.openOrders}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      / {p.orders}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-1 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                {p.saudiLicenseNumber && (
                  <p className="flex items-center gap-1.5">
                    <ShieldCheck className="size-3" />
                    License {p.saudiLicenseNumber}
                  </p>
                )}
                {p.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="size-3" />
                    {p.phone}
                    {p.email ? ` · ${p.email}` : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add partner</DialogTitle>
            <DialogDescription>
              Saudi intermediary (PRO) the office works through.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Company name</Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="AL-MA CO."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-contact">Contact person</Label>
                <Input
                  id="p-contact"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-license">Saudi license</Label>
                <Input
                  id="p-license"
                  value={form.saudiLicenseNumber}
                  onChange={(e) =>
                    setForm({ ...form, saudiLicenseNumber: e.target.value })
                  }
                  placeholder="HR-20XX-XXXXX"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Phone</Label>
                <Input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966 5x xxx xxxx"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add partner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
