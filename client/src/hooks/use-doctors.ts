import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useDoctors(enabled = true) {
  return useQuery({
    queryKey: [api.doctors.list.path],
    enabled,
    queryFn: async () => {
      const res = await fetch(api.doctors.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return api.doctors.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.doctors.create.input>) => {
      const validated = api.doctors.create.input.parse(data);
      const res = await fetch(api.doctors.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.doctors.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create doctor");
      }

      return api.doctors.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
    },
  });
}

export function useUpdateDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.doctors.update.input>) => {
      const validated = api.doctors.update.input.parse(data);
      const res = await fetch(api.doctors.update.path.replace(":doctorId", String(validated.doctorId)), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.doctors.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update doctor");
      }

      return api.doctors.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
    },
  });
}

export function useDeleteDoctor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doctorId: number) => {
      const validated = api.doctors.delete.input.parse({ doctorId });
      const res = await fetch(
        buildUrl(api.doctors.delete.path, { doctorId: validated.doctorId }),
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.doctors.delete.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to delete doctor");
      }

      return api.doctors.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.doctors.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.prescriptions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
    },
  });
}
