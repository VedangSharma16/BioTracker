import { Stethoscope } from "lucide-react";
import { motion } from "framer-motion";
import { useDashboardStats } from "@/hooks/use-dashboard";
import { useLiveHealthUpdates } from "@/hooks/use-live-health";
import { usePatientHealthView, usePatientPrescriptionsView, usePendingAlertsView } from "@/hooks/use-views";
import { useUser } from "@/hooks/use-auth";
import { AlertsPanel } from "@/components/dashboard/AlertsPanel";
import { PatientSummary } from "@/components/dashboard/PatientSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

function displayValue(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(digits);
}

export default function Dashboard() {
  useLiveHealthUpdates();

  const { data: user } = useUser();
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: patientHealth, isLoading: loadingHealth } = usePatientHealthView();
  const { data: patientPrescriptions, isLoading: loadingPrescriptions } = usePatientPrescriptionsView();
  const { data: pendingAlerts, isLoading: loadingAlerts } = usePendingAlertsView();

  const isLoading = loadingStats || loadingHealth || loadingPrescriptions || loadingAlerts;
  const isAdmin = user?.role?.toLowerCase() === "admin";

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-10">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary">Health Analytics</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {isAdmin ? "Clinical Dashboard" : "Personal Health Dashboard"}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Real-time tracking for blood sugar, cholesterol, oxygen saturation, BMI, prescriptions, and risk alerts.
          </p>
        </div>
      </motion.header>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          {isAdmin ? (
            <div className="grid gap-6 xl:grid-cols-[1.8fr_1fr]">
              <AlertsPanel alerts={pendingAlerts ?? []} />
              <Card className="border-white/10 bg-card/80 p-6">
                <h3 className="text-lg font-semibold text-foreground">Overview</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  This dashboard focuses on team-wide counts, pending alerts, and the latest patient summaries.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Patients</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.patientCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Doctors</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.doctorCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Open Alerts</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.activeAlerts ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">High Alert Patients</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{stats?.highAlertPatients ?? 0}</p>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Card className="border-white/10 bg-card/80 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average Blood Sugar</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {displayValue(stats?.avgBloodSugar)} <span className="text-base text-muted-foreground">mg/dL</span>
                  </p>
                </Card>
                <Card className="border-white/10 bg-card/80 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average Cholesterol</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {displayValue(stats?.avgCholesterol)} <span className="text-base text-muted-foreground">mg/dL</span>
                  </p>
                </Card>
                <Card className="border-white/10 bg-card/80 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average BMI</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">{displayValue(stats?.avgBmi)}</p>
                </Card>
                <Card className="border-white/10 bg-card/80 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Average Oxygen Saturation</p>
                  <p className="mt-3 text-3xl font-semibold text-foreground">
                    {displayValue(stats?.avgOxygenSaturation)} <span className="text-base text-muted-foreground">%</span>
                  </p>
                </Card>
              </div>

              <div className="mt-8">
                <AlertsPanel alerts={pendingAlerts ?? []} />
              </div>
            </>
          )}

          <section className="mt-8">
            <div className="mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {isAdmin ? "Patient Summary" : "Latest Summary"}
              </h2>
            </div>
            <PatientSummary records={patientHealth ?? []} prescriptions={patientPrescriptions ?? []} />
          </section>
        </>
      )}
    </div>
  );
}
