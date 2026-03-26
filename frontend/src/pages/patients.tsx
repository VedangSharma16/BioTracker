import { useEffect, useMemo, useState } from "react";
import { Redirect } from "wouter";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { useCreatePatient, useDeletePatient, usePatients, useUpdatePatient } from "@/hooks/use-patients";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type PatientFormState = {
  name: string;
  age: string;
  gender: "" | "Male" | "Female" | "Other";
  phoneCountryCode: string;
  phoneNumber: string;
  emergencyCountryCode: string;
  emergencyNumber: string;
  username: string;
  password: string;
};

const countryCodeOptions = ["+1", "+44", "+61", "+91", "+971"] as const;

function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatPhoneNumber(countryCode: string, localNumber: string) {
  return `${countryCode} ${normalizePhoneNumber(localNumber)}`.trim();
}

function splitPhoneNumber(value: string | null | undefined) {
  const trimmed = (value ?? "").trim();
  const match = trimmed.match(/^(\+\d{1,4})\s*(\d{0,10})$/);

  if (match) {
    return {
      countryCode: match[1],
      localNumber: match[2],
    };
  }

  return {
    countryCode: "+91",
    localNumber: normalizePhoneNumber(trimmed),
  };
}

const emptyForm: PatientFormState = {
  name: "",
  age: "",
  gender: "",
  phoneCountryCode: "+91",
  phoneNumber: "",
  emergencyCountryCode: "+91",
  emergencyNumber: "",
  username: "",
  password: "",
};

export default function Patients() {
  const { data: user } = useUser();
  const { data: patients, isLoading } = usePatients();
  const [search, setSearch] = useState("");
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const filteredPatients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return patients ?? [];

    return (patients ?? []).filter((patient) =>
      [patient.patientId, patient.name, patient.gender, patient.phone, patient.emergencyContact]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [patients, search]);

  if (!isAdmin) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <Users className="h-8 w-8 text-primary" />
            Patients
          </h1>
          <p className="mt-1 text-muted-foreground">Manage registered patients and their login access.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patients by ID, name, gender, or phone"
              className="pl-9"
            />
          </div>
          <PatientDialog mode="create" />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10">
              <TableHead>Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Emergency Contact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading patients...</TableCell>
              </TableRow>
            ) : filteredPatients.length ? (
              filteredPatients.map((patient) => (
                <TableRow key={patient.patientId} className="border-white/5">
                  <TableCell className="font-medium text-primary">#{patient.patientId}</TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.age}</TableCell>
                  <TableCell>{patient.gender}</TableCell>
                  <TableCell>{patient.phone || "-"}</TableCell>
                  <TableCell>{patient.emergencyContact || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PatientDialog mode="edit" patient={patient} />
                      <DeletePatientButton patientId={patient.patientId} patientName={patient.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No patients matched your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function PatientDialog({
  mode,
  patient,
}: {
  mode: "create" | "edit";
  patient?: {
    patientId: number;
    name: string;
    age: number;
    gender: string;
    phone: string | null;
    emergencyContact: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(emptyForm);
  const { mutate: createPatient, isPending: creating } = useCreatePatient();
  const { mutate: updatePatient, isPending: updating } = useUpdatePatient();
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && patient) {
      const phone = splitPhoneNumber(patient.phone);
      const emergencyContact = splitPhoneNumber(patient.emergencyContact);

      setForm({
        name: patient.name,
        age: String(patient.age),
        gender: patient.gender as PatientFormState["gender"],
        phoneCountryCode: phone.countryCode,
        phoneNumber: phone.localNumber,
        emergencyCountryCode: emergencyContact.countryCode,
        emergencyNumber: emergencyContact.localNumber,
        username: "",
        password: "",
      });
      return;
    }

    setForm(emptyForm);
  }, [mode, open, patient]);

  const isPending = creating || updating;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.gender) {
      toast({ title: "Error", description: "Please select a gender.", variant: "destructive" });
      return;
    }

    if (!form.age || Number(form.age) < 0) {
      toast({ title: "Error", description: "Age cannot be negative.", variant: "destructive" });
      return;
    }

    if (mode === "create") {
      if (form.phoneNumber.length !== 10) {
        toast({ title: "Error", description: "Phone is required.", variant: "destructive" });
        return;
      }

      if (form.emergencyNumber.length !== 10) {
        toast({ title: "Error", description: "Emergency contact is required.", variant: "destructive" });
        return;
      }

      if (!form.username.trim()) {
        toast({ title: "Error", description: "Username is required.", variant: "destructive" });
        return;
      }

      if (!form.password.trim()) {
        toast({ title: "Error", description: "Password is required.", variant: "destructive" });
        return;
      }
    }

    const payload = {
      name: form.name,
      age: Number(form.age),
      gender: form.gender,
      phone: formatPhoneNumber(form.phoneCountryCode, form.phoneNumber),
      emergencyContact: formatPhoneNumber(form.emergencyCountryCode, form.emergencyNumber),
    };

    if (mode === "create") {
      createPatient(
        {
          ...payload,
          username: form.username,
          password: form.password,
        },
        {
          onSuccess: () => {
            setOpen(false);
            setForm(emptyForm);
            toast({ title: "Success", description: "Patient created. Login credentials sent to the patient." });
          },
          onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
        },
      );
      return;
    }

    if (!patient) return;

    updatePatient(
      {
        patientId: patient.patientId,
        ...payload,
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast({ title: "Success", description: "Patient updated." });
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button><Plus className="mr-2 h-4 w-4" />Add Patient</Button>
        ) : (
          <Button variant="outline" size="sm"><Pencil className="mr-2 h-4 w-4" />Edit</Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Patient" : "Edit Patient"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <SimpleField label="Name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
          <SimpleField label="Age" value={form.age} onChange={(value) => setForm((current) => ({ ...current, age: value }))} type="number" min={0} />
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(value) => setForm((current) => ({ ...current, gender: value as PatientFormState["gender"] }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PhoneField
            label="Phone"
            countryCode={form.phoneCountryCode}
            number={form.phoneNumber}
            onCountryCodeChange={(value) => setForm((current) => ({ ...current, phoneCountryCode: value }))}
            onNumberChange={(value) => setForm((current) => ({ ...current, phoneNumber: normalizePhoneNumber(value) }))}
          />
          <PhoneField
            label="Emergency Contact"
            countryCode={form.emergencyCountryCode}
            number={form.emergencyNumber}
            onCountryCodeChange={(value) => setForm((current) => ({ ...current, emergencyCountryCode: value }))}
            onNumberChange={(value) => setForm((current) => ({ ...current, emergencyNumber: normalizePhoneNumber(value) }))}
          />

          {mode === "create" ? (
            <div className="space-y-4 rounded-xl border border-white/10 bg-background/30 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Patient Login</p>
                <p className="text-xs text-muted-foreground">Username and password are required for every new patient.</p>
              </div>
              <SimpleField label="Create username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} />
              <SimpleField label="Create password" value={form.password} onChange={(value) => setForm((current) => ({ ...current, password: value }))} type="password" />
            </div>
          ) : null}

          <Button type="submit" disabled={isPending} className="w-full">{isPending ? "Saving..." : mode === "create" ? "Save Patient" : "Update Patient"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePatientButton({ patientId, patientName }: { patientId: number; patientName: string }) {
  const { mutate: deletePatient, isPending } = useDeletePatient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!window.confirm(`Delete ${patientName} and all related records? This cannot be undone.`)) {
      return;
    }

    deletePatient(patientId, {
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

function SimpleField({ label, value, onChange, type = "text", min }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} min={min} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function PhoneField({
  label,
  countryCode,
  number,
  onCountryCodeChange,
  onNumberChange,
}: {
  label: string;
  countryCode: string;
  number: string;
  onCountryCodeChange: (value: string) => void;
  onNumberChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-[120px_1fr] gap-3">
        <Select value={countryCode} onValueChange={onCountryCodeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Code" />
          </SelectTrigger>
          <SelectContent>
            {countryCodeOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="10 digit number"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
        />
      </div>
      <p className="text-xs text-muted-foreground">Enter up to 10 digits.</p>
    </div>
  );
}
