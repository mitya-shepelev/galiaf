import { Injectable } from "@nestjs/common";
import type { PublicAuthContract } from "./auth.types.js";

@Injectable()
export class AuthConfigService {
  public getMode(): "dev" | "oidc" {
    return process.env.AUTH_MODE === "oidc" ? "oidc" : "dev";
  }

  public getIssuerUrl(): string {
    return process.env.AUTH_ISSUER_URL ?? "http://localhost:8081/realms/galiaf";
  }

  public getAudience(): string {
    return process.env.AUTH_AUDIENCE ?? "galiaf-core-api";
  }

  public getJwksUri(): string {
    const explicit = process.env.AUTH_JWKS_URI?.trim();

    if (explicit) {
      return explicit;
    }

    return `${this.getIssuerUrl()}/protocol/openid-connect/certs`;
  }

  public getAllowedCorsOrigins(): string[] {
    const raw = process.env.AUTH_ALLOWED_CORS_ORIGINS;

    if (!raw) {
      return [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:8081",
      ];
    }

    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  public isDevBypassEnabled(): boolean {
    const raw = process.env.AUTH_DEV_BYPASS_ENABLED;

    if (raw == null) {
      return this.getMode() === "dev";
    }

    return raw === "true";
  }

  public getPublicClientConfig(): PublicAuthContract["clients"] {
    return {
      adminWebClientId:
        process.env.AUTH_ADMIN_WEB_CLIENT_ID ?? "galiaf-admin-portal",
      managerWebClientId:
        process.env.AUTH_MANAGER_WEB_CLIENT_ID ?? "galiaf-manager-cabinet",
      employeeWebClientId:
        process.env.AUTH_EMPLOYEE_WEB_CLIENT_ID ?? "galiaf-employee-cabinet",
      mobileClientId: process.env.AUTH_MOBILE_CLIENT_ID ?? "galiaf-mobile-app",
    };
  }

  public getPublicContract(): PublicAuthContract {
    return {
      mode: this.getMode(),
      issuerUrl: this.getIssuerUrl(),
      audience: this.getAudience(),
      jwksUri: this.getJwksUri(),
      allowedCorsOrigins: this.getAllowedCorsOrigins(),
      clients: this.getPublicClientConfig(),
      flows: {
        web: "OIDC Authorization Code + PKCE with secure session cookies",
        mobile: "OIDC Authorization Code + PKCE via expo-auth-session",
        api: "Bearer access token verified against JWKS",
        chat: "Bearer access token on websocket handshake",
      },
      claimsContract: {
        globalRolesClaim: "realm_access.roles",
        activeTenantClaim: "active_tenant",
        tenantMembershipsClaim: "tenant_memberships",
      },
    };
  }
}
