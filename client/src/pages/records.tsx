import { useState } from "react";
import { format } from "date-fns";
import { useHealthRecords, useCreateHealthRecord } from "@/hooks/use-records";
import { usePatients } from "@/hooks/use-patients";
import { useUser } from "@/hooks/use-auth";
import { FilePlus, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function Records() {
  const { data: records, isLoading } = useHealthRecords();
  const { data: user } = useUser();
  const isAdmin = user?.role === "admin";
  
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Health Records
          </h1>
          <p className="text-muted-foreground mt-1">View and manage patient vital statistics.</p>
        </div>
        
        {isAdmin && <AddRecordDialog />}
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Patient</TableHead>
              <TableHead className="font-semibold text-foreground">Blood Pressure</TableHead>
              <TableHead className="font-semibold text-foreground">Blood Sugar</TableHead>
              <TableHead className="font-semibold text-foreground max-w-[300px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading records...
                </TableCell>
              </TableRow>
            ) : records?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  No health records found
                </TableCell>
              </TableRow>
            ) : (
              records?.map((record) => (
                <TableRow key={record.recordId} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium">
                    {format(new Date(record.recordDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{record.patientName || `ID: ${record.patientId}`}</div>
                  </TableCell>
                  <TableCell>
                    {record.bpSystolic && record.bpDiastolic ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm font-medium">
                        {record.bpSystolic}/{record.bpDiastolic}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.bloodSugar ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium">
                        {record.bloodSugar} <span className="text-xs ml-1 opacity-70">mg/dL</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">
                    {record.notes || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddRecordDialog() {
  const [open, setOpen] = useState(false);
  const { data: patients } = usePatients();
  const { mutate: createRecord, isPending } = useCreateHealthRecord();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    patientId: "",
    bpSystolic: "",
    bpDiastolic: "",
    bloodSugar: "",
    notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId) {
      toast({ title: "Validation Error", description: "Please select a patient", variant: "destructive" });
      return;
    }

    createRecord(
      {
        patientId: Number(formData.patientId),
        bpSystolic: formData.bpSystolic ? Number(formData.bpSystolic) : undefined,
        bpDiastolic: formData.bpDiastolic ? Number(formData.bpDiastolic) : undefined,
        bloodSugar: formData.bloodSugar ? Number(formData.bloodSugar) : undefined,
        notes: formData.notes || undefined
      },
      {
        onSuccess: () => {
          setOpen(false);
          setFormData({ patientId: "", bpSystolic: "", bpDiastolic: "", bloodSugar: "", notes: "" });
          toast({ title: "Success", description: "Health record added successfully." });
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
          <FilePlus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">Add Health Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Patient</Label>
            <Select 
              value={formData.patientId} 
              onValueChange={(val) => setFormData(p => ({ ...p, patientId: val }))}
            >
              <SelectTrigger className="bg-background/50 border-white/10 focus:ring-primary/20">
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                {patients?.map((p) => (
                  <SelectItem key={p.patientId} value={p.patientId.toString()}>
                    {p.name} (ID: {p.patientId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>BP Systolic</Label>
              <Input 
                type="number" 
                placeholder="120"
                className="bg-background/50 border-white/10 focus:ring-primary/20"
                value={formData.bpSystolic}
                onChange={(e) => setFormData(p => ({ ...p, bpSystolic: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>BP Diastolic</Label>
              <Input 
                type="number" 
                placeholder="80"
                className="bg-background/50 border-white/10 focus:ring-primary/20"
                value={formData.bpDiastolic}
                onChange={(e) => setFormData(p => ({ ...p, bpDiastolic: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Blood Sugar (mg/dL)</Label>
            <Input 
              type="number" 
              step="0.1"
              placeholder="95.5"
              className="bg-background/50 border-white/10 focus:ring-primary/20"
              value={formData.bloodSugar}
              onChange={(e) => setFormData(p => ({ ...p, bloodSugar: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea 
              placeholder="Any additional observations..."
              className="bg-background/50 border-white/10 focus:ring-primary/20 resize-none"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
            />
          </div>
          
          <div className="pt-4 flex justify-end">
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto font-semibold">
              {isPending ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
