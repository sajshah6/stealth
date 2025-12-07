import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * OAuth callback handler
 * Exchanges the auth code for a session after Google sign-in
 * Works for both dev (localhost) and production environments
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Use the request origin to redirect correctly in any environment
      const redirectUrl = new URL(next, origin);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect to home with error state
  const errorUrl = new URL("/", origin);
  errorUrl.searchParams.set("error", "auth_failed");
  return NextResponse.redirect(errorUrl);
}
