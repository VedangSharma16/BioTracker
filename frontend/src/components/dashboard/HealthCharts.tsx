import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";

type HealthRecordPoint = {
  recordId: number;
  patientId: number;
  patientName: string;
  recordDate: Date;
  bloodSugar: string | number | null;
  bpSystolic: number | null;
  bpDiastolic: number | null;
  cholesterol: string | number | null;
  oxygenSaturation: string | number | null;
  bmi: string | number | null;
  notes: string | null;
};

type HealthChartsProps = {
  records: HealthRecordPoint[];
};

function toNumber(value: string | number | null) {
  if (value === null) return null;
  return typeof value === "number" ? value : Number(value);
}

export function HealthCharts({ records }: HealthChartsProps) {
  const trendData = [...records]
    .slice(0, 8)
    .reverse()
    .map((record) => ({
      label: `${record.patientName.split(" ")[0]} ${new Date(record.recordDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      bloodSugar: toNumber(record.bloodSugar),
      cholesterol: toNumber(record.cholesterol),
      bmi: toNumber(record.bmi),
      oxygenSaturation: toNumber(record.oxygenSaturation),
    }));

  const distributionData = [
    { label: "Sugar", count: records.filter((record) => (toNumber(record.bloodSugar) ?? 0) > 180).length },
    { label: "BP", count: records.filter((record) => (record.bpSystolic ?? 0) > 140).length },
    { label: "Chol", count: records.filter((record) => (toNumber(record.cholesterol) ?? 0) > 200).length },
    { label: "O2", count: records.filter((record) => {
      const value = toNumber(record.oxygenSaturation);
      return value !== null && value < 95;
    }).length },
    { label: "BMI", count: records.filter((record) => (toNumber(record.bmi) ?? 0) > 25).length },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Blood Sugar Trend">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="bloodSugar" stroke="#38bdf8" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cholesterol Trend">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cholesterol" stroke="#f97316" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="BMI Trend">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="bmi" stroke="#facc15" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Health Distribution">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={distributionData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#34d399" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-white/10 bg-card/80 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        </div>
        {children}
      </Card>
    </motion.div>
  );
}
