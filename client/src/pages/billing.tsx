import { useMemo, useState } from "react";
import { format } from "date-fns";
import { CreditCard, Plus, Receipt, Search } from "lucide-react";
import { useBills, useCreateBill, useCreatePayment, usePaymentHistory } from "@/hooks/use-billing";
import { usePatients } from "@/hooks/use-patients";
import { useDoctors } from "@/hooks/use-doctors";
import { usePrescriptions } from "@/hooks/use-prescriptions";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const paymentMethodOptions = ["Cash", "Card", "UPI", "Net Banking", "Cheque", "Insurance"] as const;

function formatMoney(value: string | number) {
  const amount = typeof value === "number" ? value : Number(value);
  return `Rs. ${amount.toFixed(2)}`;
}

export default function Billing() {
  const { data: user } = useUser();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const { data: bills, isLoading: loadingBills } = useBills();
  const { data: payments, isLoading: loadingPayments } = usePaymentHistory();
  const [billSearch, setBillSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  const filteredBills = useMemo(() => {
    const query = billSearch.trim().toLowerCase();
    if (!query) return bills ?? [];

    return (bills ?? []).filter((bill) =>
      [bill.billNumber, bill.patientName, bill.doctorName, bill.paymentStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [billSearch, bills]);

  const filteredPayments = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase();
    if (!query) return payments ?? [];

    return (payments ?? []).filter((payment) =>
      [payment.billNumber, payment.patientName, payment.paymentMethod, payment.transactionReference, payment.receivedBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [paymentSearch, payments]);

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground">
            <Receipt className="h-8 w-8 text-primary" />
            Billing
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isAdmin ? "Create bills, record payments, and track balances." : "Review your bills and payment history."}
          </p>
        </div>

        {isAdmin ? (
          <div className="flex gap-3">
            <CreateBillDialog />
            <RecordPaymentDialog bills={bills ?? []} />
          </div>
        ) : null}
      </div>

      <Tabs defaultValue="bills" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-4">
          <SearchField value={billSearch} onChange={setBillSearch} placeholder="Search bills by patient, doctor, bill number, or status" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead>Bill</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingBills ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading bills...</TableCell>
                  </TableRow>
                ) : filteredBills.length ? (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.billId} className="border-white/5">
                      <TableCell>
                        <div className="font-medium">{bill.billNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(bill.billingDate), "dd MMM yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{bill.patientName}</div>
                        <div className="text-xs text-muted-foreground">Patient ID: {bill.patientId}</div>
                      </TableCell>
                      <TableCell>{formatMoney(bill.totalAmount)}</TableCell>
                      <TableCell>{formatMoney(bill.paidAmount)}</TableCell>
                      <TableCell>{formatMoney(bill.balanceAmount)}</TableCell>
                      <TableCell className="capitalize">{bill.paymentStatus}</TableCell>
                      <TableCell>{bill.dueDate ? format(new Date(bill.dueDate), "dd MMM yyyy") : "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No bills matched your search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <SearchField value={paymentSearch} onChange={setPaymentSearch} placeholder="Search payments by patient, bill, or payment method" />
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/10">
                  <TableHead>Date</TableHead>
                  <TableHead>Bill</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Received By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPayments ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading payments...</TableCell>
                  </TableRow>
                ) : filteredPayments.length ? (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.paymentId} className="border-white/5">
                      <TableCell>{format(new Date(payment.paymentDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>{payment.billNumber}</TableCell>
                      <TableCell>{payment.patientName}</TableCell>
                      <TableCell>{formatMoney(payment.amountPaid)}</TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell>{payment.transactionReference || "-"}</TableCell>
                      <TableCell>{payment.receivedBy || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No payments matched your search.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateBillDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    billNumber: "",
    patientId: "",
    doctorId: "",
    prescriptionId: "",
    dueDate: "",
    subtotal: "",
    taxAmount: "",
    discountAmount: "",
    notes: "",
  });
  const { toast } = useToast();
  const { mutate: createBill, isPending } = useCreateBill();
  const { data: patients } = usePatients(open);
  const { data: doctors } = useDoctors(open);
  const { data: prescriptions } = usePrescriptions();

  const selectedPatientId = Number(form.patientId || 0);
  const filteredPrescriptions = useMemo(
    () => prescriptions?.filter((prescription) => prescription.patientId === selectedPatientId) ?? [],
    [prescriptions, selectedPatientId],
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const subtotal = Number(form.subtotal);
    const taxAmount = Number(form.taxAmount || 0);
    const discountAmount = Number(form.discountAmount || 0);
    const totalAmount = subtotal + taxAmount - discountAmount;

    createBill(
      {
        billNumber: form.billNumber,
        patientId: Number(form.patientId),
        doctorId: form.doctorId && form.doctorId !== "none" ? Number(form.doctorId) : undefined,
        prescriptionId: form.prescriptionId && form.prescriptionId !== "none" ? Number(form.prescriptionId) : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        subtotal,
        taxAmount,
        discountAmount,
        totalAmount,
        billingNotes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            billNumber: "",
            patientId: "",
            doctorId: "",
            prescriptionId: "",
            dueDate: "",
            subtotal: "",
            taxAmount: "",
            discountAmount: "",
            notes: "",
          });
          toast({ title: "Success", description: "Bill created." });
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />New Bill</Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Bill</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <TextField label="Bill Number" value={form.billNumber} onChange={(value) => setForm((current) => ({ ...current, billNumber: value }))} />
          <TextField label="Due Date" value={form.dueDate} onChange={(value) => setForm((current) => ({ ...current, dueDate: value }))} type="date" />

          <SelectField
            label="Patient"
            value={form.patientId}
            onValueChange={(value) => setForm((current) => ({ ...current, patientId: value, prescriptionId: "" }))}
            placeholder="Select patient"
            options={(patients ?? []).map((patient) => ({ value: String(patient.patientId), label: patient.name }))}
          />

          <SelectField
            label="Doctor"
            value={form.doctorId}
            onValueChange={(value) => setForm((current) => ({ ...current, doctorId: value }))}
            placeholder="Select doctor"
            options={(doctors ?? []).map((doctor) => ({ value: String(doctor.doctorId), label: `${doctor.name} - ${doctor.specialization}` }))}
            allowEmpty
          />

          <SelectField
            label="Prescription"
            value={form.prescriptionId}
            onValueChange={(value) => setForm((current) => ({ ...current, prescriptionId: value }))}
            placeholder="Optional prescription"
            options={filteredPrescriptions.map((prescription) => ({
              value: String(prescription.prescriptionId),
              label: `${prescription.patientName} - ${format(new Date(prescription.prescriptionDate), "dd MMM yyyy")}`,
            }))}
            allowEmpty
          />

          <div className="hidden md:block" />

          <TextField label="Subtotal" value={form.subtotal} onChange={(value) => setForm((current) => ({ ...current, subtotal: value }))} type="number" />
          <TextField label="Tax Amount" value={form.taxAmount} onChange={(value) => setForm((current) => ({ ...current, taxAmount: value }))} type="number" />
          <TextField label="Discount Amount" value={form.discountAmount} onChange={(value) => setForm((current) => ({ ...current, discountAmount: value }))} type="number" />
          <TextField
            label="Total"
            value={String((Number(form.subtotal || 0) + Number(form.taxAmount || 0) - Number(form.discountAmount || 0)).toFixed(2))}
            onChange={() => undefined}
            disabled
          />

          <div className="md:col-span-2">
            <TextField label="Notes" value={form.notes} onChange={(value) => setForm((current) => ({ ...current, notes: value }))} />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Saving..." : "Save Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentDialog({ bills }: { bills: Array<{ billId: number; billNumber: string; patientId: number; balanceAmount: string | number }> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    billId: "",
    patientId: "",
    amountPaid: "",
    paymentMethod: "",
    transactionReference: "",
    receivedBy: "",
    paymentNotes: "",
  });
  const { toast } = useToast();
  const { mutate: createPayment, isPending } = useCreatePayment();

  const availableBills = bills.filter((bill) => Number(bill.balanceAmount) > 0);

  const handleBillChange = (value: string) => {
    const selectedBill = availableBills.find((bill) => String(bill.billId) === value);
    setForm((current) => ({
      ...current,
      billId: value,
      patientId: selectedBill ? String(selectedBill.patientId) : "",
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    createPayment(
      {
        billId: Number(form.billId),
        patientId: Number(form.patientId),
        amountPaid: Number(form.amountPaid),
        paymentMethod: form.paymentMethod as (typeof paymentMethodOptions)[number],
        transactionReference: form.transactionReference || undefined,
        receivedBy: form.receivedBy || undefined,
        paymentNotes: form.paymentNotes || undefined,
        paymentStatus: "completed",
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({
            billId: "",
            patientId: "",
            amountPaid: "",
            paymentMethod: "",
            transactionReference: "",
            receivedBy: "",
            paymentNotes: "",
          });
          toast({ title: "Success", description: "Payment recorded." });
        },
        onError: (error) => toast({ title: "Error", description: error.message, variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><CreditCard className="mr-2 h-4 w-4" />Record Payment</Button>
      </DialogTrigger>
      <DialogContent className="border-white/10 bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <SelectField
            label="Bill"
            value={form.billId}
            onValueChange={handleBillChange}
            placeholder="Select outstanding bill"
            options={availableBills.map((bill) => ({
              value: String(bill.billId),
              label: `${bill.billNumber} - Balance ${formatMoney(bill.balanceAmount)}`,
            }))}
          />
          <TextField label="Amount Paid" value={form.amountPaid} onChange={(value) => setForm((current) => ({ ...current, amountPaid: value }))} type="number" />
          <SelectField
            label="Payment Method"
            value={form.paymentMethod}
            onValueChange={(value) => setForm((current) => ({ ...current, paymentMethod: value }))}
            placeholder="Select payment method"
            options={paymentMethodOptions.map((method) => ({ value: method, label: method }))}
          />
          <TextField label="Transaction Reference" value={form.transactionReference} onChange={(value) => setForm((current) => ({ ...current, transactionReference: value }))} />
          <TextField label="Received By" value={form.receivedBy} onChange={(value) => setForm((current) => ({ ...current, receivedBy: value }))} />
          <TextField label="Notes" value={form.paymentNotes} onChange={(value) => setForm((current) => ({ ...current, paymentNotes: value }))} />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Save Payment"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full md:w-96">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  placeholder,
  options,
  allowEmpty = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  allowEmpty?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty ? <SelectItem value="none">None</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
