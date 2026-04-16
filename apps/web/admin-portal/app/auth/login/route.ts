import { NextResponse } from "next/server";
import {
  buildAuthorizationUrl,
  createPkcePair,
  fetchOidcDiscovery,
} from "@galiaf/sdk/web-auth";
import {
  OIDC_RETURN_TO_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  OIDC_VERIFIER_COOKIE_NAME,
  getCookieOptions,
  loadPublicAuthConfig,
  resolveOidcClientId,
  resolveOidcRedirectUri,
  resolveRequestOrigin,
  sanitizeReturnTo,
} from "../../auth";

export async function GET(request: Request) {
  const origin = resolveRequestOrigin(request);
  const returnTo = sanitizeReturnTo(
    new URL(request.url).searchParams.get("returnTo"),
  );
  const authConfig = await loadPublicAuthConfig();

  if (authConfig.mode !== "oidc") {
    return NextResponse.redirect(new URL(returnTo, origin));
  }

  const discovery = await fetchOidcDiscovery(authConfig.issuerUrl);
  const { verifier, challenge } = await createPkcePair();
  const state = crypto.randomUUID();
  const redirectUri = resolveOidcRedirectUri(origin);
  const authorizationUrl = buildAuthorizationUrl({
    authorizationEndpoint: discovery.authorization_endpoint,
    clientId: resolveOidcClientId(authConfig),
    redirectUri,
    state,
    codeChallenge: challenge,
  });
  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(OIDC_STATE_COOKIE_NAME, state, getCookieOptions(600));
  response.cookies.set(
    OIDC_VERIFIER_COOKIE_NAME,
    verifier,
    getCookieOptions(600),
  );
  response.cookies.set(
    OIDC_RETURN_TO_COOKIE_NAME,
    returnTo,
    getCookieOptions(600),
  );

  return response;
}
