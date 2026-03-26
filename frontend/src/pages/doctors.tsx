import { useEffect, useMemo, useState } from "react";
import { Redirect } from "wouter";
import { Pencil, Plus, Search, Stethoscope, Trash2 } from "lucide-react";
import { useCreateDoctor, useDeleteDoctor, useDoctors, useUpdateDoctor } from "@/hooks/use-doctors";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type DoctorFormState = {
  name: string;
  specialization: string;
  contact: string;
};

const emptyForm: DoctorFormState = {
  name: "",
  specialization: "",
  contact: "",
};

export default function Doctors() {
  const { data: user } = useUser();
  const { data: doctors, isLoading } = useDoctors();
  const [search, setSearch] = useState("");
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return doctors ?? [];

    return (doctors ?? []).filter((doctor) =>
      [doctor.doctorId, doctor.name, doctor.specialization, doctor.contact]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [doctors, search]);

  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <Stethoscope className="h-8 w-8 text-primary" />
            Doctors
          </h1>
          <p className="mt-1 text-muted-foreground">Manage clinicians and specializations.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search doctors by ID, name, or specialization"
              className="pl-9"
            />
          </div>
          <DoctorDialog mode="create" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10">
              <TableHead>Doctor ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading doctors...</TableCell>
              </TableRow>
            ) : filteredDoctors.length ? (
              filteredDoctors.map((doctor) => (
                <TableRow key={doctor.doctorId} className="border-white/5">
                  <TableCell className="font-medium text-primary">#{doctor.doctorId}</TableCell>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>{doctor.specialization}</TableCell>
                  <TableCell>{doctor.contact || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DoctorDialog mode="edit" doctor={doctor} />
                      <DeleteDoctorButton doctorId={doctor.doctorId} doctorName={doctor.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No doctors matched your search.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DoctorDialog({
  mode,
  doctor,
}: {
  mode: "create" | "edit";
  doctor?: {
    doctorId: number;
    name: string;
    specialization: string;
    contact: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DoctorFormState>(emptyForm);
  const { mutate: createDoctor, isPending: creating } = useCreateDoctor();
  const { mutate: updateDoctor, isPending: updating } = useUpdateDoctor();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && doctor) {
      setForm({
        name: doctor.name,
        specialization: doctor.specialization,
        contact: doctor.contact ?? "",
      });
      return;
    }

    setForm(emptyForm);
  }, [doctor, mode, open]);

  const isPending = creating || updating;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      name: form.name,
      specialization: form.specialization,
      contact: form.contact || undefined,
    };

    if (mode === "create") {
      createDoctor(payload, {
        onSuccess: () => {
          setOpen(false);
          setForm(emptyForm);
          toast({ title: "Success", description: "Doctor created." });
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      });
      return;
    }

    if (!doctor) return;

    updateDoctor(
      {
        doctorId: doctor.doctorId,
        ...payload,
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ title: "Success", description: "Doctor updated." });
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button><Plus className="mr-2 h-4 w-4" />Add Doctor</Button>
        ) : (
          <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Edit</Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Doctor" : "Edit Doctor"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <SimpleField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <SimpleField label="Specialization" value={form.specialization} onChange={(value) => setForm((current) => ({ ...current, specialization: value }))} />
          <SimpleField label="Contact" value={form.contact} onChange={(value) => setForm((current) => ({ ...current, contact: value }))} />
          <Button type="submit" disabled={isPending} className="w-full">{isPending ? "Saving..." : mode === "create" ? "Save Doctor" : "Update Doctor"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDoctorButton({ doctorId, doctorName }: { doctorId: number; doctorName: string }) {
  const { mutate: deleteDoctor, isPending } = useDeleteDoctor();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!window.confirm(`Delete ${doctorName} and related prescriptions? This cannot be undone.`)) {
      return;
    }

    deleteDoctor(doctorId, {
      onSuccess: ({ message }) => {
        toast({ title: "Success", description: message });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <Button variant="destructive" size="sm" disabled={isPending} onClick={handleDelete}>
      <Trash2 className="mr-2 h-4 w-4" />
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}

function SimpleField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
