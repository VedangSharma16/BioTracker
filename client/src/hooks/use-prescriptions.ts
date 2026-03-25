import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function usePrescriptions() {
  return useQuery({
    queryKey: [api.prescriptions.list.path],
    queryFn: async () => {
      const res = await fetch(api.prescriptions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch prescriptions");
      return api.prescriptions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.prescriptions.create.input>) => {
      const validated = api.prescriptions.create.input.parse(data);
      const res = await fetch(api.prescriptions.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const err = api.prescriptions.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create prescription");
      }
      
      return api.prescriptions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path] });
    },
  });
}

export function useUpdatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.prescriptions.update.input>) => {
      const validated = api.prescriptions.update.input.parse(data);
      const res = await fetch(
        buildUrl(api.prescriptions.update.path, { prescriptionId: validated.prescriptionId }),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validated),
          credentials: "include",
        },
      );

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.prescriptions.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update prescription");
      }

      return api.prescriptions.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path] });
    },
  });
}

export function useDeletePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescriptionId: number) => {
      const validated = api.prescriptions.delete.input.parse({ prescriptionId });
      const res = await fetch(
        buildUrl(api.prescriptions.delete.path, {
          prescriptionId: validated.prescriptionId,
        }),
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.prescriptions.delete.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to delete prescription");
      }

      return api.prescriptions.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
    },
  });
}
