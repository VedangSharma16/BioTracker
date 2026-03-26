import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

async function fetchAndParse<T>(path: string, schema: { parse: (data: unknown) => T }) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return schema.parse(await res.json());
}

export function usePatientPrescriptionsView() {
  return useQuery({
    queryKey: [api.views.patientPrescriptions.path],
    queryFn: () => fetchAndParse(api.views.patientPrescriptions.path, api.views.patientPrescriptions.responses[200]),
  });
}

export function usePatientHealthView() {
  return useQuery({
    queryKey: [api.views.patientHealth.path],
    queryFn: () => fetchAndParse(api.views.patientHealth.path, api.views.patientHealth.responses[200]),
  });
}

export function usePendingAlertsView() {
  return useQuery({
    queryKey: [api.views.pendingAlerts.path],
    queryFn: () => fetchAndParse(api.views.pendingAlerts.path, api.views.pendingAlerts.responses[200]),
  });
}

export function useHealthRiskView() {
  return useQuery({
    queryKey: [api.views.healthRisk.path],
    queryFn: () => fetchAndParse(api.views.healthRisk.path, api.views.healthRisk.responses[200]),
  });
}
