import { createSupabaseContext, fromSupabaseUrl, unauthorizedResponse } from "@supabase/server";
import { type NextRequest } from "next/server";

export interface SupabaseAuthContext {
  userId?: string;
  email?: string;
  role?: string;
  isAuthenticated: boolean;
  claims?: Record<string, unknown>;
  error?: string;
}

/**
 * Validates incoming Supabase Bearer token or credentials from request
 * using @supabase/server JWT & JWKS verification.
 */
export async function getSupabaseServerUser(request: NextRequest): Promise<SupabaseAuthContext> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    return {
      isAuthenticated: false,
      error: "Supabase URL not configured",
    };
  }

  try {
    const contextResult = await createSupabaseContext(request, {
      env: {
        url,
        publishableKeys: publishableKey ? { default: publishableKey } : {},
        secretKeys: process.env.SUPABASE_SECRET_KEY ? { default: process.env.SUPABASE_SECRET_KEY } : {},
        jwks: process.env.SUPABASE_JWKS_URL ? new URL(process.env.SUPABASE_JWKS_URL) : new URL(`${url}/auth/v1/.well-known/jwks.json`),
      },
    });

    if (contextResult.error) {
      return {
        isAuthenticated: false,
        error: contextResult.error.message,
      };
    }

    if (contextResult.data && contextResult.data.jwtClaims) {
      const claims = contextResult.data.jwtClaims as Record<string, unknown>;
      const userClaims = (contextResult.data.userClaims || {}) as Record<string, unknown>;

      return {
        isAuthenticated: true,
        userId: ((claims.sub || userClaims.id || "") as string),
        email: ((claims.email || userClaims.email || "") as string),
        role: ((claims.role || userClaims.role || "authenticated") as string),
        claims,
      };
    }

    return {
      isAuthenticated: false,
      error: "No authenticated claims found",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication error";
    return {
      isAuthenticated: false,
      error: message,
    };
  }
}

export { createSupabaseContext, fromSupabaseUrl, unauthorizedResponse };
