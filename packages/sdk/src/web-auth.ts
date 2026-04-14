export interface OidcDiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
}

export interface OidcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  id_token?: string;
}

export interface ExchangeAuthorizationCodeInput {
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  fetch?: typeof fetch;
}

export interface BuildAuthorizationUrlInput {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope?: string;
  extraParams?: Record<string, string | undefined>;
}

const DEFAULT_SCOPE = "openid profile email";

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";

  for (const byte of input) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/u, "");
}

function decodeJwtSegment(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment
      .replace(/-/gu, "+")
      .replace(/_/gu, "/")
      .padEnd(Math.ceil(segment.length / 4) * 4, "=");

    return JSON.parse(atob(normalized)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = base64UrlEncode(verifierBytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );

  return {
    verifier,
    challenge: base64UrlEncode(new Uint8Array(digest)),
  };
}

export async function fetchOidcDiscovery(
  issuerUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OidcDiscoveryDocument> {
  const response = await fetchImpl(
    `${issuerUrl.replace(/\/+$/u, "")}/.well-known/openid-configuration`,
    {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load OIDC discovery document: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<OidcDiscoveryDocument>;
}

export function buildAuthorizationUrl(
  input: BuildAuthorizationUrlInput,
): string {
  const url = new URL(input.authorizationEndpoint);

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("scope", input.scope ?? DEFAULT_SCOPE);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");

  for (const [key, value] of Object.entries(input.extraParams ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

export async function exchangeAuthorizationCode(
  input: ExchangeAuthorizationCodeInput,
): Promise<OidcTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    code: input.code,
    code_verifier: input.codeVerifier,
  });

  const response = await (input.fetch ?? fetch)(input.tokenEndpoint, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(
      typeof payload.error_description === "string"
        ? payload.error_description
        : `Token exchange failed: ${response.status} ${response.statusText}`,
    );
  }

  if (
    typeof payload.access_token !== "string" ||
    typeof payload.token_type !== "string"
  ) {
    throw new Error("OIDC token response does not contain access_token.");
  }

  return {
    access_token: payload.access_token,
    token_type: payload.token_type,
    expires_in:
      typeof payload.expires_in === "number" ? payload.expires_in : undefined,
    scope: typeof payload.scope === "string" ? payload.scope : undefined,
    refresh_token:
      typeof payload.refresh_token === "string" ? payload.refresh_token : undefined,
    id_token: typeof payload.id_token === "string" ? payload.id_token : undefined,
  };
}

export function decodeJwtPayload(
  token: string,
): Record<string, unknown> | null {
  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  return decodeJwtSegment(payload);
}
