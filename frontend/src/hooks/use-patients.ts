import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function usePatients(enabled = true) {
  return useQuery({
    queryKey: [api.patients.list.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.patients.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch patients");
      return api.patients.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.patients.create.input>) => {
      const validated = api.patients.create.input.parse(data);
      const res = await fetch(api.patients.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.patients.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create patient");
      }

      return api.patients.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useUpdatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.patients.update.input>) => {
      const validated = api.patients.update.input.parse(data);
      const res = await fetch(api.patients.update.path.replace(":patientId", String(validated.patientId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.patients.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update patient");
      }

      return api.patients.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patientId: number) => {
      const validated = api.patients.delete.input.parse({ patientId });
      const res = await fetch(
        buildUrl(api.patients.delete.path, { patientId: validated.patientId }),
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.patients.delete.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to delete patient");
      }

      return api.patients.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.healthRecords.list.path] });
    },
  });
}
