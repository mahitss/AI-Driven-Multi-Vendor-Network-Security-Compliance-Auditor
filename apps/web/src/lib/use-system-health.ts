import { useQuery } from "@tanstack/react-query";
import { fetchHealth, type SystemHealth } from "@/lib/api-client";

export const SYSTEM_HEALTH_QUERY_KEY = ["system-health"] as const;

export function useSystemHealth() {
  const query = useQuery<SystemHealth>({
    queryKey: SYSTEM_HEALTH_QUERY_KEY,
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 1,
    staleTime: 8000,
  });

  const isOnline = Boolean(!query.isError && query.data?.status === "healthy");
  const isOffline = Boolean(query.isError || (query.data && query.data.status !== "healthy"));
  const isChecking = query.isLoading;

  return {
    ...query,
    health: query.data,
    isOnline,
    isOffline,
    isChecking,
  };
}
