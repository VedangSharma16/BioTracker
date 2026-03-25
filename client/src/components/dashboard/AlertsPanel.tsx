import { motion } from "framer-motion";
import { AlertTriangle, BellRing, HeartPulse } from "lucide-react";
import { Card } from "@/components/ui/card";

type AlertRow = {
  alertId: number;
  patientId: number;
  patientName: string;
  alertType: string;
  alertMessage: string;
  alertDate: Date;
  status: string;
};

const alertTone = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes("sugar")) return "border-red-500/30 bg-red-500/10 text-red-300";
  if (normalized.includes("bp")) return "border-orange-500/30 bg-orange-500/10 text-orange-300";
  if (normalized.includes("bmi")) return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  if (normalized.includes("oxygen")) return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
};

const alertIcon = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes("bp")) return HeartPulse;
  if (normalized.includes("sugar")) return AlertTriangle;
  return BellRing;
};

export function AlertsPanel({ alerts }: { alerts: AlertRow[] }) {
  return (
    <Card className="border-white/10 bg-card/80 p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Pending Alerts</h3>
          <p className="text-sm text-muted-foreground">Live issues generated from incoming health records.</p>
        </div>
        <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {alerts.length} open
        </span>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-muted-foreground">
            No pending alerts right now.
          </div>
        ) : (
          alerts.slice(0, 6).map((alert) => {
            const Icon = alertIcon(alert.alertType);
            return (
              <motion.div
                key={alert.alertId}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl border p-4 ${alertTone(alert.alertType)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-black/10 p-2">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold">{alert.patientName}</p>
                    <p className="text-sm font-medium">{alert.alertType}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{alert.alertMessage}</p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </Card>
  );
}
