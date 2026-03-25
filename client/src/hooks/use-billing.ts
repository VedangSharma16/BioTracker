import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useBills() {
  return useQuery({
    queryKey: [api.billing.bills.list.path],
    queryFn: async () => {
      const res = await fetch(api.billing.bills.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bills");
      return api.billing.bills.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.billing.bills.create.input>) => {
      const validated = api.billing.bills.create.input.parse(data);
      const res = await fetch(api.billing.bills.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.billing.bills.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to create bill");
      }

      return api.billing.bills.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}

export function usePaymentHistory() {
  return useQuery({
    queryKey: [api.billing.payments.list.path],
    queryFn: async () => {
      const res = await fetch(api.billing.payments.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch payment history");
      return api.billing.payments.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.billing.payments.create.input>) => {
      const validated = api.billing.payments.create.input.parse(data);
      const res = await fetch(api.billing.payments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.billing.payments.create.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to record payment");
      }

      return api.billing.payments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}
