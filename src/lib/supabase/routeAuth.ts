import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export interface RouteAuthResult {
  user: User | null;
  supabase: SupabaseClient | null;
}

/**
 * Resolves the authenticated user for Route Handlers.
 * Tries cookie session first, then Authorization: Bearer from the browser client.
 */
export async function getRouteAuth(request: Request): Promise<RouteAuthResult> {
  const config = getSupabasePublicConfig();
  if (!config) return { user: null, supabase: null };

  const cookieStore = await cookies();
  const cookieClient = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });

  const { data: cookieUserData } = await cookieClient.auth.getUser();
  if (cookieUserData.user) {
    return { user: cookieUserData.user, supabase: cookieClient };
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return { user: null, supabase: cookieClient };
  }

  const bearerClient = createClient(config.url, config.publishableKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const { data: bearerUserData, error } = await bearerClient.auth.getUser(token);
  if (error || !bearerUserData.user) {
    return { user: null, supabase: cookieClient };
  }

  return { user: bearerUserData.user, supabase: bearerClient };
}
