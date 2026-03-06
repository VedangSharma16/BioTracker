import { useState } from "react";
import { format } from "date-fns";
import { usePrescriptions, useCreatePrescription } from "@/hooks/use-prescriptions";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { useUser } from "@/hooks/use-auth";
import { Pill, Plus, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export default function Prescriptions() {
  const { data: prescriptions, isLoading } = usePrescriptions();
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Pill className="w-8 h-8 text-primary" />
            Prescriptions
          </h1>
          <p className="text-muted-foreground mt-1">Manage patient prescriptions and medications.</p>
        </div>
        
        {isAdmin && <AddPrescriptionDialog />}
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground glass-panel rounded-2xl">
            Loading prescriptions...
          </div>
        ) : prescriptions?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground glass-panel rounded-2xl">
            <Pill className="w-12 h-12 mx-auto mb-3 opacity-20 text-primary" />
            No prescriptions found
          </div>
        ) : (
          prescriptions?.map((prescription) => (
            <div key={prescription.prescriptionId} className="glass-panel rounded-2xl overflow-hidden border border-white/10 transition-all hover:border-primary/30">
              <div className="bg-white/5 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    {prescription.patientName || `Patient #${prescription.patientId}`}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="w-4 h-4" />
                      Dr. {prescription.doctorName || prescription.doctorId}
                    </span>
                    <span>•</span>
                    <span>{format(new Date(prescription.prescriptionDate), "MMMM d, yyyy")}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 md:p-6 bg-card/40">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Medications</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prescription.medicines?.map((med, idx) => (
                    <div key={idx} className="bg-background/50 border border-white/10 rounded-xl p-4 flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary mt-0.5">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{med.medicineName}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{med.dosage} - {med.frequency}</p>
                        {med.refillIntervalDays && (
                          <p className="text-xs text-primary/80 mt-2 bg-primary/10 inline-block px-2 py-0.5 rounded-full font-medium">
                            Refill: {med.refillIntervalDays} days
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AddPrescriptionDialog() {
  const [open, setOpen] = useState(false);
  const { data: patients } = usePatients();
  const { data: doctors } = useDoctors();
  const { mutate: createPrescription, isPending } = useCreatePrescription();
  const { toast } = useToast();
  
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [medicines, setMedicines] = useState([{ medicineName: "", dosage: "", frequency: "", refillIntervalDays: "" }]);

  const addMedicine = () => {
    setMedicines([...medicines, { medicineName: "", dosage: "", frequency: "", refillIntervalDays: "" }]);
  };

  const removeMedicine = (index: number) => {
    if (medicines.length > 1) {
      setMedicines(medicines.filter((_, i) => i !== index));
    }
  };

  const updateMedicine = (index: number, field: string, value: string) => {
    const newMeds = [...medicines];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedicines(newMeds);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !doctorId) {
      toast({ title: "Validation Error", description: "Select patient and doctor", variant: "destructive" });
      return;
    }
    
    const validMeds = medicines.filter(m => m.medicineName && m.dosage && m.frequency);
    if (validMeds.length === 0) {
      toast({ title: "Validation Error", description: "Add at least one valid medication", variant: "destructive" });
      return;
    }

    createPrescription(
      {
        prescription: {
          patientId: Number(patientId),
          doctorId: Number(doctorId)
        },
        medicines: validMeds.map(m => ({
          medicineName: m.medicineName,
          dosage: m.dosage,
          frequency: m.frequency,
          refillIntervalDays: m.refillIntervalDays ? Number(m.refillIntervalDays) : undefined
        }))
      },
      {
        onSuccess: () => {
          setOpen(false);
          setPatientId("");
          setDoctorId("");
          setMedicines([{ medicineName: "", dosage: "", frequency: "", refillIntervalDays: "" }]);
          toast({ title: "Success", description: "Prescription created." });
        },
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          New Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-card border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Prescription</DialogTitle>
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
                  {patients?.map((p) => (
                    <SelectItem key={p.patientId} value={p.patientId.toString()}>{p.name}</SelectItem>
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
                  {doctors?.map((d) => (
                    <SelectItem key={d.doctorId} value={d.doctorId.toString()}>Dr. {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Medications</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMedicine} className="border-white/10 bg-white/5 hover:bg-white/10 text-xs h-8">
                <Plus className="w-3 h-3 mr-1" /> Add Pill
              </Button>
            </div>
            
            <div className="space-y-3">
              {medicines.map((med, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 p-4 bg-background/30 border border-white/10 rounded-xl relative group">
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <Input 
                      placeholder="Amoxicillin" 
                      className="h-9 bg-background/50 border-white/10"
                      value={med.medicineName}
                      onChange={(e) => updateMedicine(index, "medicineName", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Dosage</Label>
                    <Input 
                      placeholder="500mg" 
                      className="h-9 bg-background/50 border-white/10"
                      value={med.dosage}
                      onChange={(e) => updateMedicine(index, "dosage", e.target.value)}
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    <Label className="text-xs text-muted-foreground">Freq</Label>
                    <Input 
                      placeholder="2x daily" 
                      className="h-9 bg-background/50 border-white/10"
                      value={med.frequency}
                      onChange={(e) => updateMedicine(index, "frequency", e.target.value)}
                    />
                  </div>
                  <div className="col-span-10 sm:col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Refill(days)</Label>
                    <Input 
                      type="number" 
                      placeholder="30" 
                      className="h-9 bg-background/50 border-white/10"
                      value={med.refillIntervalDays}
                      onChange={(e) => updateMedicine(index, "refillIntervalDays", e.target.value)}
                    />
                  </div>
                  {medicines.length > 1 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedicine(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="pt-4 flex justify-end border-t border-white/10">
            <Button type="submit" disabled={isPending} className="font-semibold shadow-lg shadow-primary/20">
              {isPending ? "Saving..." : "Create Prescription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
