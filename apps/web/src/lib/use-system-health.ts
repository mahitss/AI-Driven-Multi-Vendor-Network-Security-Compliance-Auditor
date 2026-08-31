import { useQuery } from "@tanstack/react-query";
import { fetchHealth, type SystemHealth } from "@/lib/api-client";

export const SYSTEM_HEALTH_QUERY_KEY = ["system-health"] as const;

export type SystemConnectionState = "connecting" | "online" | "degraded" | "offline";

export function useSystemHealth() {
  const query = useQuery<SystemHealth>({
    queryKey: SYSTEM_HEALTH_QUERY_KEY,
    queryFn: fetchHealth,
    refetchInterval: 15000,
    retry: 1,
    staleTime: 8000,
  });

  let connectionState: SystemConnectionState = "connecting";
  if (query.isLoading && !query.data) {
    connectionState = "connecting";
  } else if (query.isError) {
    connectionState = "offline";
  } else if (query.data?.status === "healthy") {
    connectionState = "online";
  } else if (query.data?.status === "degraded") {
    connectionState = "degraded";
  } else {
    connectionState = "offline";
  }

  const isOnline = connectionState === "online";
  const isOffline = connectionState === "offline";
  const isDegraded = connectionState === "degraded";
  const isConnecting = connectionState === "connecting";
  const isChecking = query.isLoading;

  return {
    ...query,
    health: query.data,
    connectionState,
    isOnline,
    isOffline,
    isDegraded,
    isConnecting,
    isChecking,
  };
}
