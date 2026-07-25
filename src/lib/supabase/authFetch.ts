import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** Same-origin fetch with Supabase session cookies and Bearer fallback for Route Handlers. */
export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const supabase = createBrowserSupabaseClient();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
