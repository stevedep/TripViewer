import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url: string;
    
    // Handle trips endpoint with query parameters
    if (queryKey[0] === "/api/trips" && queryKey.length > 1) {
      const [endpoint, fromStation, toStation, dateTime] = queryKey;
      url = `${endpoint}?fromStation=${encodeURIComponent(fromStation as string)}&toStation=${encodeURIComponent(toStation as string)}&dateTime=${encodeURIComponent(dateTime as string)}`;
    } else {
      url = queryKey.join("/") as string;
    }
    
    console.log("QueryClient: Making request to:", url);
    
    const res = await fetch(url, {
      credentials: "include",
    });

    console.log("QueryClient: Response status:", res.status, res.statusText);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log("QueryClient: Response data:", JSON.stringify(data, null, 2).substring(0, 500) + "...");
    return data;
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
