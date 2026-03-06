import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
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
