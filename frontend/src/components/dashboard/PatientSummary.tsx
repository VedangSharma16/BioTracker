import { Card } from "@/components/ui/card";

type SummaryRow = {
  patientId: number;
  patientName: string;
  bloodSugar: string | number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  oxygenSaturation: string | number | null;
  bmi: string | number | null;
};

type PrescriptionRow = {
  patientId: number;
  doctorId: number;
  doctorName: string;
};

export function PatientSummary({
  records,
  prescriptions,
}: {
  records: SummaryRow[];
  prescriptions: PrescriptionRow[];
}) {
  const latestMap = new Map<number, SummaryRow>();
  for (const record of records) {
    if (!latestMap.has(record.patientId)) {
      latestMap.set(record.patientId, record);
    }
  }

  const latestByPatient = Array.from(latestMap.values());
  const prescriptionMap = new Map<number, PrescriptionRow>();

  for (const prescription of prescriptions) {
    if (!prescriptionMap.has(prescription.patientId)) {
      prescriptionMap.set(prescription.patientId, prescription);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {latestByPatient.map((record) => {
        const prescription = prescriptionMap.get(record.patientId);

        return (
          <Card key={record.patientId} className="border-white/10 bg-card/80 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{record.patientName}</h3>
                <p className="text-sm text-muted-foreground">Latest health summary</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Patient ID" value={record.patientId} />
              <Metric label="Doctor ID" value={prescription?.doctorId ?? "—"} />
            </div>

            <div className="mt-3 rounded-xl bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Assigned Doctor</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{prescription?.doctorName ?? "—"}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <Metric label="Blood Sugar" value={record.bloodSugar ?? "—"} />
              <Metric
                label="Blood Pressure"
                value={record.bpSystolic && record.bpDiastolic ? `${record.bpSystolic}/${record.bpDiastolic}` : "—"}
              />
              <Metric label="BMI" value={record.bmi ?? "—"} />
              <Metric label="Oxygen" value={record.oxygenSaturation ?? "—"} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
