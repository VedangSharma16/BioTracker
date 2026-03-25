import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useAlerts() {
  return useQuery({
    queryKey: [api.alerts.list.path],
    queryFn: async () => {
      const res = await fetch(api.alerts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return api.alerts.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.alerts.updateStatus.input>) => {
      const validated = api.alerts.updateStatus.input.parse(data);
      const params = new URLSearchParams({
        alertId: String(validated.alertId),
        status: validated.status,
      });
      const res = await fetch(`${buildUrl(api.alerts.updateStatus.path)}?${params.toString()}`, {
        method: api.alerts.updateStatus.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const err = api.alerts.updateStatus.responses[400].parse(await res.json());
            throw new Error(err.message);
          }
        }
        throw new Error("Failed to update alert");
      }

      return api.alerts.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.pendingAlerts.path] });
    },
  });
}
