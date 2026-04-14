import { cookies } from "next/headers";
import {
  ApiClient,
  createDevAuthHeaders,
  demoAuthContexts,
  type PublicAuthContract,
} from "@galiaf/sdk";

const SESSION_COOKIE_NAME =
  process.env.GALIAF_AUTH_SESSION_COOKIE_NAME ?? "galiaf_employee_access_token";
export const ID_TOKEN_COOKIE_NAME =
  process.env.GALIAF_AUTH_ID_TOKEN_COOKIE_NAME ?? "galiaf_employee_id_token";
export const OIDC_STATE_COOKIE_NAME =
  process.env.GALIAF_OIDC_STATE_COOKIE_NAME ?? "galiaf_employee_oidc_state";
export const OIDC_VERIFIER_COOKIE_NAME =
  process.env.GALIAF_OIDC_VERIFIER_COOKIE_NAME ?? "galiaf_employee_oidc_verifier";
export const OIDC_RETURN_TO_COOKIE_NAME =
  process.env.GALIAF_OIDC_RETURN_TO_COOKIE_NAME ?? "galiaf_employee_return_to";

export type ResolvedEmployeeAuth =
  | {
      kind: "dev";
      api: ApiClient;
    }
  | {
      kind: "oidc";
      api: ApiClient;
      accessToken: string;
    }
  | {
      kind: "login-required";
    };

export function areDevPersonasEnabled(): boolean {
  const raw = process.env.GALIAF_ENABLE_DEV_PERSONAS;

  if (raw != null) {
    return raw === "true";
  }

  return process.env.NODE_ENV !== "production";
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export function getCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

export function resolveApiBaseUrl(): string {
  return process.env.GALIAF_API_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
}

export function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export async function resolveEmployeeAuth(): Promise<ResolvedEmployeeAuth> {
  if (areDevPersonasEnabled()) {
    return {
      kind: "dev",
      api: new ApiClient({
        baseUrl: resolveApiBaseUrl(),
        defaultHeaders: createDevAuthHeaders(demoAuthContexts.employeeAlpha),
      }),
    };
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get(getSessionCookieName())?.value;

  if (!accessToken) {
    return {
      kind: "login-required",
    };
  }

  return {
    kind: "oidc",
    accessToken,
    api: new ApiClient({
      baseUrl: resolveApiBaseUrl(),
      defaultHeaders: {
        authorization: `Bearer ${accessToken}`,
      },
    }),
  };
}

export async function loadPublicAuthConfig(): Promise<PublicAuthContract> {
  return new ApiClient({
    baseUrl: resolveApiBaseUrl(),
  }).getPublicAuthConfig();
}

export function resolveOidcClientId(config: PublicAuthContract): string {
  return process.env.GALIAF_OIDC_CLIENT_ID ?? config.clients.employeeWebClientId;
}

export function resolveOidcRedirectUri(origin: string): string {
  return process.env.GALIAF_OIDC_REDIRECT_URI ?? `${origin}/auth/callback`;
}

export function resolveOidcPostLogoutRedirectUri(origin: string): string {
  return process.env.GALIAF_OIDC_POST_LOGOUT_REDIRECT_URI ?? `${origin}/`;
}
