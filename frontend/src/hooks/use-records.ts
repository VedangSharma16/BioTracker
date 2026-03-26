import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useHealthRecords() {
  return useQuery({
    queryKey: [api.healthRecords.list.path],
    queryFn: async () => {
      const res = await fetch(api.healthRecords.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch health records");
      return api.healthRecords.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHealthRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.healthRecords.create.input>) => {
      const validated = api.healthRecords.create.input.parse(data);
      const res = await fetch(api.healthRecords.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.healthRecords.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create health record");
      }
      
      return api.healthRecords.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.healthRecords.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.patientHealth.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.pendingAlerts.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.healthRisk.path] });
    },
  });
}

export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.healthRecords.update.input>) => {
      const validated = api.healthRecords.update.input.parse(data);
      const res = await fetch(api.healthRecords.update.path.replace(":recordId", String(validated.recordId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.healthRecords.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update health record");
      }

      return api.healthRecords.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.healthRecords.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.patientHealth.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.pendingAlerts.path] });
      queryClient.invalidateQueries({ queryKey: [api.views.healthRisk.path] });
    },
  });
}
