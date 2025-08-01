import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { searchTrips, getTrainDetails, getPopularStations } from "./nsApi";

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log("QueryClient: Processing query key:", queryKey);
    
    // Handle different API endpoints using frontend services
    if (queryKey[0] === "/api/trips" && queryKey.length > 1) {
      const [, fromStation, toStation, dateTime] = queryKey;
      return await searchTrips({
        fromStation: fromStation as string,
        toStation: toStation as string,
        dateTime: dateTime as string,
      });
    }
    
    if (queryKey[0] === "/api/stations") {
      return getPopularStations();
    }
    
    if (queryKey[0] === "/api/train" && queryKey.length >= 3) {
      const [, trainNumber, stationCode] = queryKey;
      const urlParams = new URLSearchParams(window.location.search);
      const dateTime = urlParams.get('dateTime') || new Date().toISOString();
      
      return await getTrainDetails(
        trainNumber as string,
        stationCode as string,
        dateTime
      );
    }
    
    // Fallback for any other requests (shouldn't happen in static mode)
    throw new Error(`Unsupported query key: ${queryKey.join("/")}`);
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
