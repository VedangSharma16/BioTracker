import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, Search } from "lucide-react";
import { useAlerts, useUpdateAlertStatus } from "@/hooks/use-alerts";
import { useUser } from "@/hooks/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { data: alerts, isLoading } = useAlerts();
  const { data: user } = useUser();
  const { mutate: updateAlertStatus, isPending } = useUpdateAlertStatus();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const isAdmin = user?.role?.toLowerCase() === "admin";

  const filteredAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts ?? [];

    return (alerts ?? []).filter((alert) =>
      [alert.patientName, alert.alertType, alert.alertMessage, alert.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [alerts, search]);

  const handleStatusChange = (alertId: number, status: "resolved" | "suppressed") => {
    updateAlertStatus(
      { alertId, status },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: `Alert marked as ${status}.`,
          });
        },
        onError: (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" />
            System Alerts
          </h1>
          <p className="text-muted-foreground mt-1">Monitoring critical events and automated notifications.</p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={isAdmin ? "Search alerts, patients, or status" : "Search alerts by type, message, or status"}
            className="pl-9"
          />
        </div>
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
              {isAdmin ? <TableHead className="text-right font-semibold text-foreground">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-10 text-muted-foreground">
                  Loading alerts...
                </TableCell>
              </TableRow>
            ) : filteredAlerts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20 text-emerald-500" />
                  No alerts matched your search.
                </TableCell>
              </TableRow>
            ) : (
              filteredAlerts.map((alert) => (
                <TableRow key={alert.alertId} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(new Date(alert.alertDate), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{alert.patientName || `ID: ${alert.patientId}`}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-sm font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      {alert.alertType}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {alert.alertMessage}
                  </TableCell>
                  <TableCell>
                    <AlertStatusBadge status={alert.status} />
                  </TableCell>
                  {isAdmin ? (
                    <TableCell className="text-right">
                      {alert.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleStatusChange(alert.alertId, "resolved")}>
                            Resolve
                          </Button>
                          <Button size="sm" variant="secondary" disabled={isPending} onClick={() => handleStatusChange(alert.alertId, "suppressed")}>
                            Suppress
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action needed</span>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AlertStatusBadge({ status }: { status: string }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
        Pending
      </Badge>
    );
  }

  if (status === "suppressed") {
    return (
      <Badge variant="outline" className="bg-slate-500/10 text-slate-300 border-slate-500/20 px-2 py-0.5 rounded-full">
        Suppressed
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 px-2 py-0.5 rounded-full">
      Resolved
    </Badge>
  );
}
