import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  decodeJwtPayload,
  exchangeAuthorizationCode,
  fetchOidcDiscovery,
} from "@galiaf/sdk/web-auth";
import {
  ID_TOKEN_COOKIE_NAME,
  OIDC_RETURN_TO_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  OIDC_VERIFIER_COOKIE_NAME,
  getCookieOptions,
  getSessionCookieName,
  loadPublicAuthConfig,
  resolveOidcClientId,
  resolveOidcRedirectUri,
  resolveRequestOrigin,
  sanitizeReturnTo,
} from "../../auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = resolveRequestOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(OIDC_STATE_COOKIE_NAME)?.value;
  const codeVerifier = cookieStore.get(OIDC_VERIFIER_COOKIE_NAME)?.value;
  const returnTo = sanitizeReturnTo(
    cookieStore.get(OIDC_RETURN_TO_COOKIE_NAME)?.value,
  );

  if (!code || !state || !expectedState || state !== expectedState || !codeVerifier) {
    return NextResponse.redirect(new URL(returnTo, origin));
  }

  const authConfig = await loadPublicAuthConfig();

  if (authConfig.mode !== "oidc") {
    return NextResponse.redirect(new URL(returnTo, origin));
  }

  const discovery = await fetchOidcDiscovery(authConfig.issuerUrl);
  const tokenResponse = await exchangeAuthorizationCode({
    tokenEndpoint: discovery.token_endpoint,
    clientId: resolveOidcClientId(authConfig),
    redirectUri: resolveOidcRedirectUri(origin),
    code,
    codeVerifier,
  });
  const response = NextResponse.redirect(new URL(returnTo, origin));
  const payload = decodeJwtPayload(tokenResponse.access_token);
  const maxAge =
    typeof tokenResponse.expires_in === "number"
      ? tokenResponse.expires_in
      : typeof payload?.exp === "number"
        ? Math.max(payload.exp - Math.floor(Date.now() / 1000), 60)
        : 3600;

  response.cookies.set(
    getSessionCookieName(),
    tokenResponse.access_token,
    getCookieOptions(maxAge),
  );

  if (typeof tokenResponse.id_token === "string") {
    response.cookies.set(
      ID_TOKEN_COOKIE_NAME,
      tokenResponse.id_token,
      getCookieOptions(maxAge),
    );
  }

  response.cookies.delete(OIDC_STATE_COOKIE_NAME);
  response.cookies.delete(OIDC_VERIFIER_COOKIE_NAME);
  response.cookies.delete(OIDC_RETURN_TO_COOKIE_NAME);

  return response;
}
