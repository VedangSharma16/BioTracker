import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
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

export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.billing.payments.update.input>) => {
      const validated = api.billing.payments.update.input.parse(data);
      const res = await fetch(buildUrl(api.billing.payments.update.path, { paymentId: validated.paymentId }), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.billing.payments.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update payment");
      }

      return api.billing.payments.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await fetch(buildUrl(api.billing.payments.delete.path, { paymentId }), {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete payment");
      }

      return api.billing.payments.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}


export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.billing.bills.update.input>) => {
      const validated = api.billing.bills.update.input.parse(data);
      const res = await fetch(buildUrl(api.billing.bills.update.path, { billId: validated.billId }), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = api.billing.bills.update.responses[400].parse(await res.json());
          throw new Error(err.message);
        }
        throw new Error("Failed to update bill");
      }

      return api.billing.bills.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (billId: number) => {
      const res = await fetch(buildUrl(api.billing.bills.delete.path, { billId }), {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete bill");
      }

      return api.billing.bills.delete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.billing.bills.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.billing.payments.list.path] });
    },
  });
}
