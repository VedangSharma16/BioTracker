import { format } from "date-fns";
import { useAlerts } from "@/hooks/use-alerts";
import { BellAlertIcon } from "@heroicons/react/24/outline"; // Using heroicons as fallback or lucide if needed
import { Bell, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Alerts() {
  const { data: alerts, isLoading } = useAlerts();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <Bell className="w-8 h-8 text-amber-500" />
          System Alerts
        </h1>
        <p className="text-muted-foreground mt-1">Monitoring critical events and automated notifications.</p>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <Table>
          <TableHeader className="bg-white/5">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="font-semibold text-foreground">Date</TableHead>
              <TableHead className="font-semibold text-foreground">Patient</TableHead>
              <TableHead className="font-semibold text-foreground">Type</TableHead>
              <TableHead className="font-semibold text-foreground">Message</TableHead>
              <TableHead className="font-semibold text-foreground">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Loading alerts...
                </TableCell>
              </TableRow>
            ) : alerts?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                  All clear. No alerts found.
                </TableCell>
              </TableRow>
            ) : (
              alerts?.map((alert) => (
                <TableRow key={alert.alertId} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(new Date(alert.alertDate), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{alert.patientName || `ID: ${alert.patientId}`}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-sm font-medium">
                      {alert.alertType === 'critical' && <AlertTriangle className="w-3.5 h-3.5 text-destructive" />}
                      {alert.alertType}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {alert.alertMessage}
                  </TableCell>
                  <TableCell>
                    {alert.status === 'pending' ? (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Resolved
                      </Badge>
                    )}
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
