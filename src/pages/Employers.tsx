import { api } from "@/convex/_generated/api";
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
import { Building2, Loader2, Plus } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

const initialForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  industry: "",
  address: "",
};

export default function Employers() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initialForm);

  const rows = useQuery(api.clients.list);
  const create = useMutation(api.clients.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast("Employer name is required");
      return;
    }
    setBusy(true);
    try {
      await create({
        name: form.name.trim(),
        contactPerson: form.contactPerson || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        industry: form.industry || undefined,
        address: form.address || undefined,
      });
      setOpen(false);
      setForm(initialForm);
      toast("Employer added");
    } catch (err) {
      toast("Could not add employer", {
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
            Employers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The companies and intermediaries who hire through the office.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add employer
        </Button>
      </div>

      {!rows ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border py-16 text-center">
          <Building2 className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No employers yet</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Add the first Saudi employer to start placing candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((c) => (
            <div
              key={c._id}
              className="rounded-md border border-border/80 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[15px] font-semibold tracking-tight">
                    {c.name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.industry ?? "Industry not set"}
                    {c.contactPerson ? ` · ${c.contactPerson}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {c.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border/70 pt-4">
                <div>
                  <p className="text-label">Orders</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {c.openOrders}
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      open
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-label">Placements</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {c.placements}
                  </p>
                </div>
                <div>
                  <p className="text-label">Fees due</p>
                  <p className="tabular mt-1 text-lg font-semibold">
                    {c.feesOutstanding > 0
                      ? `SAR ${c.feesOutstanding.toLocaleString("en-US")}`
                      : "0"}
                  </p>
                </div>
              </div>
              {(c.email || c.phone || c.address) && (
                <p className="mt-3 truncate text-xs text-muted-foreground">
                  {[c.phone, c.email, c.address].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add employer</DialogTitle>
            <DialogDescription>
              Saudi company or intermediary hiring through the office.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Company name</Label>
              <Input
                id="e-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-contact">Contact person</Label>
                <Input
                  id="e-contact"
                  value={form.contactPerson}
                  onChange={(e) =>
                    setForm({ ...form, contactPerson: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-industry">Industry</Label>
                <Input
                  id="e-industry"
                  value={form.industry}
                  onChange={(e) =>
                    setForm({ ...form, industry: e.target.value })
                  }
                  placeholder="Domestic services"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="e-email">Email</Label>
                <Input
                  id="e-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="e-phone">Phone</Label>
                <Input
                  id="e-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+966 5x xxx xxxx"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-address">Address</Label>
              <Input
                id="e-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Riyadh, Saudi Arabia"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add employer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
