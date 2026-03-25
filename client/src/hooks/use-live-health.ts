import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useLiveHealthUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onmessage = () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.healthRecords.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.patientHealth.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.pendingAlerts.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.healthRisk.path] });
    };

    return () => {
      socket.close();
    };
  }, [queryClient]);
}
