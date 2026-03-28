import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, FilePlus, FileText, Pencil, Search } from "lucide-react";
import { useCreateHealthRecord, useHealthRecords, useUpdateHealthRecord } from "@/hooks/use-records";
import { usePatients } from "@/hooks/use-patients";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type RecordFormState = {
  patientId: string;
  bpSystolic: string;
  bpDiastolic: string;
  bloodSugar: string;
  cholesterol: string;
  oxygenSaturation: string;
  bmi: string;
  notes: string;
};

const emptyForm: RecordFormState = {
  patientId: "",
  bpSystolic: "",
  bpDiastolic: "",
  bloodSugar: "",
  cholesterol: "",
  oxygenSaturation: "",
  bmi: "",
  notes: "",
};

type HealthRecordRow = NonNullable<ReturnType<typeof useHealthRecords>["data"]>[number];

export default function Records() {
  const { data: records, isLoading } = useHealthRecords();
  const { data: user } = useUser();
  const [search, setSearch] = useState("");
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records ?? [];

    return (records ?? []).filter((record) =>
      [record.patientName, record.notes, record.bloodSugar, record.cholesterol, record.bmi, record.oxygenSaturation]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [records, search]);

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <FileText className="h-8 w-8 text-primary" />
            Health Records
          </h1>
          <p className="mt-1 text-muted-foreground">Detailed vitals, BMI, cholesterol, and oxygen saturation tracking.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={isAdmin ? "Search records by patient or metric" : "Search records by date, note, or metric"}
              className="pl-9"
            />
          </div>
          {isAdmin ? <RecordDialog mode="create" /> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Blood Sugar</TableHead>
              <TableHead>Blood Pressure</TableHead>
              <TableHead>Cholesterol</TableHead>
              <TableHead>Oxygen</TableHead>
              <TableHead>BMI</TableHead>
              <TableHead>Notes</TableHead>
              {isAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="py-10 text-center text-muted-foreground">Loading records...</TableCell>
              </TableRow>
            ) : filteredRecords.length ? (
              filteredRecords.map((record) => (
                <TableRow key={record.recordId} className="border-white/5 hover:bg-white/5">
                  <TableCell>{format(new Date(record.recordDate), "MMM d, yyyy")}</TableCell>
                  <TableCell className="font-medium">{record.patientName}</TableCell>
                  <TableCell>{record.bloodSugar ?? "-"}</TableCell>
                  <TableCell>{record.bpSystolic && record.bpDiastolic ? `${record.bpSystolic}/${record.bpDiastolic}` : "-"}</TableCell>
                  <TableCell>{record.cholesterol ?? "-"}</TableCell>
                  <TableCell>{record.oxygenSaturation ?? "-"}</TableCell>
                  <TableCell>{record.bmi ?? "-"}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">{record.notes || "-"}</TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      <RecordDialog mode="edit" record={record} />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-muted-foreground">
                  <Activity className="mx-auto mb-3 h-10 w-10 opacity-20" />
                  No health records matched your search
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function RecordDialog({ mode, record }: { mode: "create" | "edit"; record?: HealthRecordRow }) {
  const [open, setOpen] = useState(false);
  const { data: patients } = usePatients();
  const { mutate: createRecord, isPending: creating } = useCreateHealthRecord();
  const { mutate: updateRecord, isPending: updating } = useUpdateHealthRecord();
  const { toast } = useToast();
  const [formData, setFormData] = useState<RecordFormState>(emptyForm);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && record) {
      setFormData({
        patientId: String(record.patientId),
        bpSystolic: record.bpSystolic ? String(record.bpSystolic) : "",
        bpDiastolic: record.bpDiastolic ? String(record.bpDiastolic) : "",
        bloodSugar: record.bloodSugar ? String(record.bloodSugar) : "",
        cholesterol: record.cholesterol ? String(record.cholesterol) : "",
        oxygenSaturation: record.oxygenSaturation ? String(record.oxygenSaturation) : "",
        bmi: record.bmi ? String(record.bmi) : "",
        notes: record.notes || "",
      });
      return;
    }

    setFormData(emptyForm);
  }, [mode, open, record]);

  const isPending = creating || updating;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.patientId) {
      toast({ title: "Validation error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    const payload = {
      patientId: Number(formData.patientId),
      bpSystolic: formData.bpSystolic ? Number(formData.bpSystolic) : undefined,
      bpDiastolic: formData.bpDiastolic ? Number(formData.bpDiastolic) : undefined,
      bloodSugar: formData.bloodSugar ? Number(formData.bloodSugar) : undefined,
      cholesterol: formData.cholesterol ? Number(formData.cholesterol) : undefined,
      oxygenSaturation: formData.oxygenSaturation ? Number(formData.oxygenSaturation) : undefined,
      bmi: formData.bmi ? Number(formData.bmi) : undefined,
      notes: formData.notes || undefined,
    };

    if (mode === "edit" && record) {
      updateRecord(
        {
          recordId: record.recordId,
          ...payload,
        },
        {
          onSuccess: () => {
            setOpen(false);
            toast({ title: "Success", description: "Health record updated successfully." });
          },
          onError: (error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
          },
        },
      );
      return;
    }

    createRecord(payload, {
      onSuccess: () => {
        setOpen(false);
        setFormData(emptyForm);
        toast({ title: "Success", description: "Health record added successfully." });
      },
      onError: (error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button className="font-semibold">
            <FilePlus className="mr-2 h-4 w-4" />
            Add Record
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-card">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Health Record" : "Edit Health Record"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select value={formData.patientId} onValueChange={(value) => setFormData((current) => ({ ...current, patientId: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients?.map((patient) => (
                  <SelectItem key={patient.patientId} value={String(patient.patientId)}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="BP Systolic" value={formData.bpSystolic} onChange={(value) => setFormData((current) => ({ ...current, bpSystolic: value }))} />
            <Field label="BP Diastolic" value={formData.bpDiastolic} onChange={(value) => setFormData((current) => ({ ...current, bpDiastolic: value }))} />
            <Field label="Blood Sugar" value={formData.bloodSugar} onChange={(value) => setFormData((current) => ({ ...current, bloodSugar: value }))} />
            <Field label="Cholesterol" value={formData.cholesterol} onChange={(value) => setFormData((current) => ({ ...current, cholesterol: value }))} />
            <Field label="Oxygen Saturation" value={formData.oxygenSaturation} onChange={(value) => setFormData((current) => ({ ...current, oxygenSaturation: value }))} />
            <Field label="BMI" value={formData.bmi} onChange={(value) => setFormData((current) => ({ ...current, bmi: value }))} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Any additional notes..."
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving..." : mode === "create" ? "Save Record" : "Update Record"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" step="0.1" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
