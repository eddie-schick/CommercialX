import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache settings
      staleTime: 5 * 60 * 1000, // Data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Cache kept for 10 minutes (formerly cacheTime)
      
      // Retry settings
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch settings
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // TEMPORARILY BYPASSED: Skip redirect for dealer routes during development
  // TODO: Re-enable redirect before production
  const currentPath = window.location.pathname;
  if (currentPath.startsWith("/dealer")) {
    return;
  }

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // Suppress expected errors (authentication errors for public routes, etc.)
    if (error instanceof TRPCClientError) {
      const isExpectedError = 
        error.data?.code === "UNAUTHORIZED" && 
        (event.query.queryKey[0] === "auth" || event.query.queryKey[0] === "profile");
      
      if (!isExpectedError) {
        console.error("[API Query Error]", error);
      }
    } else {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    
    // Suppress expected errors (authentication errors during login flow, etc.)
    if (error instanceof TRPCClientError) {
      const isExpectedError = 
        error.data?.code === "UNAUTHORIZED" && 
        (event.mutation.options.mutationKey?.[0] === "auth" || 
         event.mutation.options.mutationKey?.[0] === "profile");
      
      if (!isExpectedError) {
        console.error("[API Mutation Error]", error);
      }
    } else {
      console.error("[API Mutation Error]", error);
    }
  }
});

// Helper to get Supabase session token
async function getSupabaseToken(): Promise<string | null> {
  try {
    const { getSupabaseClient } = await import('./lib/supabase');
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('[tRPC] Failed to get session:', error);
      return null;
    }
    
    return session?.access_token || null;
  } catch (error) {
    console.warn('[tRPC] Error getting Supabase token:', error);
    return null;
  }
}

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const token = await getSupabaseToken();
        if (token) {
          return {
            authorization: `Bearer ${token}`,
          };
        }
        return {};
      },
      fetch(input, init) {
        // Add timeout to fetch requests (25 seconds - slightly less than component timeout)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn("[tRPC] Request timeout after 25 seconds");
          controller.abort();
        }, 25000);

        return globalThis
          .fetch(input, {
            ...(init ?? {}),
            credentials: "include",
            signal: controller.signal,
          })
          .finally(() => {
            clearTimeout(timeoutId);
          });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
