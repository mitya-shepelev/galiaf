import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fetchOidcDiscovery } from "@galiaf/sdk/web-auth";
import {
  ID_TOKEN_COOKIE_NAME,
  OIDC_RETURN_TO_COOKIE_NAME,
  OIDC_STATE_COOKIE_NAME,
  OIDC_VERIFIER_COOKIE_NAME,
  getSessionCookieName,
  loadPublicAuthConfig,
  resolveOidcPostLogoutRedirectUri,
  resolveRequestOrigin,
} from "../../auth";

export async function GET(request: Request) {
  const origin = resolveRequestOrigin(request);
  const cookieStore = await cookies();
  const idTokenHint = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value;
  const authConfig = await loadPublicAuthConfig();
  const postLogoutRedirectUri = resolveOidcPostLogoutRedirectUri(origin);
  let redirectUrl = new URL(postLogoutRedirectUri, origin).toString();

  if (authConfig.mode === "oidc") {
    const discovery = await fetchOidcDiscovery(authConfig.issuerUrl);

    if (discovery.end_session_endpoint) {
      const endSessionUrl = new URL(discovery.end_session_endpoint);

      endSessionUrl.searchParams.set(
        "post_logout_redirect_uri",
        postLogoutRedirectUri,
      );

      if (idTokenHint) {
        endSessionUrl.searchParams.set("id_token_hint", idTokenHint);
      }

      redirectUrl = endSessionUrl.toString();
    }
  }

  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete(getSessionCookieName());
  response.cookies.delete(ID_TOKEN_COOKIE_NAME);
  response.cookies.delete(OIDC_STATE_COOKIE_NAME);
  response.cookies.delete(OIDC_VERIFIER_COOKIE_NAME);
  response.cookies.delete(OIDC_RETURN_TO_COOKIE_NAME);

  return response;
}
