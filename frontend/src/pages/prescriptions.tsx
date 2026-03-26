import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Pill,
  Plus,
  Search,
  SquarePen,
  Stethoscope,
  Trash2,
  X,
} from "lucide-react";
import {
  useCreatePrescription,
  useDeletePrescription,
  usePrescriptions,
  useUpdatePrescription,
} from "@/hooks/use-prescriptions";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type PrescriptionRecord = NonNullable<ReturnType<typeof usePrescriptions>["data"]>[number];
type EditableMedicine = {
  medicineName: string;
  dosage: string;
  frequency: string;
  refillIntervalDays: string;
};

type GroupedPrescription = {
  patientId: number;
  patientName?: string | null;
  latestPrescriptionDate: string | Date;
  doctorNames: string[];
  doctorIds: number[];
  medicines: Array<{
    medicineName: string;
    dosage: string;
    frequency: string;
    refillIntervalDays: number | null;
  }>;
  prescriptions: PrescriptionRecord[];
};

const emptyMedicine = (): EditableMedicine => ({
  medicineName: "",
  dosage: "",
  frequency: "",
  refillIntervalDays: "",
});

export default function Prescriptions() {
  const { data: prescriptions, isLoading } = usePrescriptions();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const [expandedPatients, setExpandedPatients] = useState<Record<number, boolean>>({});
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const groupedPrescriptions = useMemo(() => {
    const grouped = new Map<number, GroupedPrescription>();

    for (const prescription of prescriptions ?? []) {
      const existing = grouped.get(prescription.patientId);
      const doctorLabel = prescription.doctorName || `Dr. ${prescription.doctorId}`;

      if (!existing) {
        grouped.set(prescription.patientId, {
          patientId: prescription.patientId,
          patientName: prescription.patientName,
          latestPrescriptionDate: prescription.prescriptionDate,
          doctorNames: [doctorLabel],
          doctorIds: [prescription.doctorId],
          medicines: [...(prescription.medicines ?? [])],
          prescriptions: [prescription],
        });
        continue;
      }

      existing.prescriptions.push(prescription);

      if (new Date(prescription.prescriptionDate) > new Date(existing.latestPrescriptionDate)) {
        existing.latestPrescriptionDate = prescription.prescriptionDate;
      }

      if (!existing.doctorNames.includes(doctorLabel)) {
        existing.doctorNames.push(doctorLabel);
      }

      if (!existing.doctorIds.includes(prescription.doctorId)) {
        existing.doctorIds.push(prescription.doctorId);
      }

      for (const medicine of prescription.medicines ?? []) {
        const duplicate = existing.medicines.some((current) =>
          current.medicineName === medicine.medicineName &&
          current.dosage === medicine.dosage &&
          current.frequency === medicine.frequency &&
          current.refillIntervalDays === medicine.refillIntervalDays,
        );

        if (!duplicate) {
          existing.medicines.push(medicine);
        }
      }
    }

    const query = search.trim().toLowerCase();
    const rows = Array.from(grouped.values()).sort(
      (left, right) =>
        new Date(right.latestPrescriptionDate).getTime() -
        new Date(left.latestPrescriptionDate).getTime(),
    );

    if (!query) {
      return rows;
    }

    return rows.filter((group) =>
      [
        group.patientId,
        group.patientName,
        group.doctorIds.join(", "),
        group.doctorNames.join(", "),
        group.medicines.map((medicine) => medicine.medicineName).join(", "),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [prescriptions, search]);

  const toggleExpanded = (patientId: number) => {
    setExpandedPatients((current) => ({
      ...current,
      [patientId]: !current[patientId],
    }));
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Pill className="w-8 h-8 text-primary" />
            Prescriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage patient prescriptions and medications.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search patients, doctors, or medicines"
              className="pl-9 text-foreground"
            />
          </div>
          {isAdmin && <PrescriptionDialog mode="create" />}
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground glass-panel rounded-2xl">
            Loading prescriptions...
          </div>
        ) : groupedPrescriptions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-20 text-primary" />
            No prescriptions found
          </div>
        ) : (
          groupedPrescriptions.map((group) => {
            const isExpanded = isAdmin ? !!expandedPatients[group.patientId] : true;

            return (
              <div
                key={group.patientId}
                className="glass-panel rounded-2xl overflow-hidden border border-white/10 transition-all hover:border-primary/30"
              >
                <div className="bg-white/5 p-4 md:p-6 border-b border-white/10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {group.patientName || `Patient #${group.patientId}`}
                      </h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Patient ID</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">#{group.patientId}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-background/40 px-3 py-2">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Doctor ID</p>
                          <p className="mt-1 text-sm font-semibold text-foreground">
                            {group.doctorIds.map((doctorId) => `#${doctorId}`).join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Stethoscope className="w-4 h-4" />
                          {group.doctorNames.join(", ")}
                        </span>
                        <span>
                          Latest prescription:{" "}
                          {format(new Date(group.latestPrescriptionDate), "MMMM d, yyyy")}
                        </span>
                      </div>
                    </div>

                    {isAdmin ? (
                      <Button variant="outline" onClick={() => toggleExpanded(group.patientId)}>
                        {isExpanded ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Hide Prescriptions
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            View Prescriptions
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>

                {isExpanded ? (
                  <div className="p-4 md:p-6 bg-card/40 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                        Medications
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.medicines.map((medication, index) => (
                          <div
                            key={`${group.patientId}-${medication.medicineName}-${index}`}
                            className="bg-background/50 border border-white/10 rounded-xl p-4 flex items-start gap-3"
                          >
                            <div className="bg-primary/10 p-2 rounded-lg text-primary mt-0.5">
                              <Pill className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{medication.medicineName}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {medication.dosage} - {medication.frequency}
                              </p>
                              {medication.refillIntervalDays ? (
                                <p className="text-xs text-primary/80 mt-2 bg-primary/10 inline-block px-2 py-0.5 rounded-full font-medium">
                                  Refill: {medication.refillIntervalDays} days
                                </p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          Prescription Entries
                        </h4>
                        <div className="space-y-3">
                          {group.prescriptions.map((prescription) => (
                            <div
                              key={prescription.prescriptionId}
                              className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-white/10 bg-background/30 px-4 py-3"
                            >
                              <div>
                                <p className="font-medium text-foreground">
                                  {prescription.doctorName || `Doctor #${prescription.doctorId}`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(prescription.prescriptionDate), "MMMM d, yyyy")} -{" "}
                                  {prescription.medicines.length} medication
                                  {prescription.medicines.length === 1 ? "" : "s"}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <PrescriptionDialog mode="edit" prescription={prescription} />
                                <DeletePrescriptionButton
                                  prescriptionId={prescription.prescriptionId}
                                  patientName={group.patientName || `Patient #${group.patientId}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function DeletePrescriptionButton({
  prescriptionId,
  patientName,
}: {
  prescriptionId: number;
  patientName: string;
}) {
  const { mutate: deletePrescription, isPending } = useDeletePrescription();
  const { toast } = useToast();

  const handleDelete = () => {
    if (!window.confirm(`Delete this prescription for ${patientName}? This cannot be undone.`)) {
      return;
    }

    deletePrescription(prescriptionId, {
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

function PrescriptionDialog({
  mode,
  prescription,
}: {
  mode: "create" | "edit";
  prescription?: PrescriptionRecord;
}) {
  const [open, setOpen] = useState(false);
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { mutate: createPrescription, isPending: isCreating } = useCreatePrescription();
  const { mutate: updatePrescription, isPending: isUpdating } = useUpdatePrescription();
  const { toast } = useToast();

  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [medicines, setMedicines] = useState<EditableMedicine[]>([emptyMedicine()]);

  const isEditMode = mode === "edit" && prescription;
  const isPending = isCreating || isUpdating;

  const resetForm = () => {
    if (isEditMode && prescription) {
      setPatientId(String(prescription.patientId));
      setDoctorId(String(prescription.doctorId));
      setMedicines(
        prescription.medicines.length > 0
          ? prescription.medicines.map((medicine) => ({
              medicineName: medicine.medicineName,
              dosage: medicine.dosage,
              frequency: medicine.frequency,
              refillIntervalDays: medicine.refillIntervalDays?.toString() ?? "",
            }))
          : [emptyMedicine()],
      );
      return;
    }

    setPatientId("");
    setDoctorId("");
    setMedicines([emptyMedicine()]);
  };

  const addMedicine = () => {
    setMedicines((current) => [...current, emptyMedicine()]);
  };

  const removeMedicine = (index: number) => {
    setMedicines((current) =>
      current.length > 1 ? current.filter((_, currentIndex) => currentIndex !== index) : current,
    );
  };

  const updateMedicine = (index: number, field: keyof EditableMedicine, value: string) => {
    setMedicines((current) =>
      current.map((medicine, currentIndex) =>
        currentIndex === index ? { ...medicine, [field]: value } : medicine,
      ),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!patientId || !doctorId) {
      toast({
        title: "Validation Error",
        description: "Select patient and doctor",
        variant: "destructive",
      });
      return;
    }

    const validMeds = medicines.filter(
      (medicine) => medicine.medicineName && medicine.dosage && medicine.frequency,
    );

    if (validMeds.length === 0) {
      toast({
        title: "Validation Error",
        description: "Add at least one valid medication",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      prescription: {
        patientId: Number(patientId),
        doctorId: Number(doctorId),
      },
      medicines: validMeds.map((medicine) => ({
        medicineName: medicine.medicineName,
        dosage: medicine.dosage,
        frequency: medicine.frequency,
        refillIntervalDays: medicine.refillIntervalDays
          ? Number(medicine.refillIntervalDays)
          : undefined,
      })),
    };

    if (isEditMode && prescription) {
      updatePrescription(
        {
          prescriptionId: prescription.prescriptionId,
          ...payload,
        },
        {
          onSuccess: () => {
            setOpen(false);
            resetForm();
            toast({ title: "Success", description: "Prescription updated." });
          },
          onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          },
        },
      );
      return;
    }

    createPrescription(payload, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
        toast({ title: "Success", description: "Prescription created." });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        {isEditMode ? (
          <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
            <SquarePen className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            New Prescription
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Prescription" : "Create Prescription"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/20">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {patients?.map((patient) => (
                    <SelectItem key={patient.patientId} value={patient.patientId.toString()}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Doctor</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/20">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent className="bg-card border-white/10">
                  {doctors?.map((doctor) => (
                    <SelectItem key={doctor.doctorId} value={doctor.doctorId.toString()}>
                      Dr. {doctor.name} - {doctor.specialization}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medications</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMedicine}
                className="border-white/10 bg-white/5 hover:bg-white/10 text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Medicine
              </Button>
            </div>

            <div className="space-y-3">
              {medicines.map((medicine, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 p-4 bg-background/30 border border-white/10 rounded-xl relative group"
                >
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input
                      placeholder="Amoxicillin"
                      className="h-9 bg-background/50 border-white/10"
                      value={medicine.medicineName}
                      onChange={(event) =>
                        updateMedicine(index, "medicineName", event.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Dosage</Label>
                    <Input
                      placeholder="500mg"
                      className="h-9 bg-background/50 border-white/10"
                      value={medicine.dosage}
                      onChange={(event) => updateMedicine(index, "dosage", event.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Frequency</Label>
                    <Input
                      placeholder="2x daily"
                      className="h-9 bg-background/50 border-white/10"
                      value={medicine.frequency}
                      onChange={(event) =>
                        updateMedicine(index, "frequency", event.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-10 sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Refill(days)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      className="h-9 bg-background/50 border-white/10"
                      value={medicine.refillIntervalDays}
                      onChange={(event) =>
                        updateMedicine(index, "refillIntervalDays", event.target.value)
                      }
                    />
                  </div>
                  {medicines.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedicine(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end border-t border-white/10">
            <Button type="submit" disabled={isPending} className="font-semibold shadow-lg shadow-primary/20">
              {isPending
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save Changes"
                  : "Create Prescription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

