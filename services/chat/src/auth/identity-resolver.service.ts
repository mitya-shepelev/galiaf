import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { Socket } from "socket.io";
import { AuthConfigService } from "./auth-config.service.js";
import type { RequestIdentity } from "./auth.types.js";

type HeaderValue = string | string[] | undefined;

type RequestLike = {
  headers: Record<string, HeaderValue>;
};

@Injectable()
export class IdentityResolverService {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  public constructor(
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
  ) {}

  public async resolveRequest(request: RequestLike): Promise<RequestIdentity | null> {
    const bearerToken = this.extractBearerToken(request.headers.authorization);

    if (bearerToken) {
      return this.verifyOidcToken(bearerToken);
    }

    const devHeader = request.headers["x-dev-auth-context"];

    if (typeof devHeader === "string" && this.authConfig.isDevBypassEnabled()) {
      return this.parseDevHeader(devHeader);
    }

    return null;
  }

  public async resolveSocket(client: Socket): Promise<RequestIdentity | null> {
    const auth = client.handshake.auth as
      | {
          token?: unknown;
          authorization?: unknown;
          devAuthContext?: unknown;
        }
      | undefined;

    const requestLike: RequestLike = {
      headers: {
        ...client.handshake.headers,
        authorization:
          typeof auth?.authorization === "string"
            ? auth.authorization
            : typeof auth?.token === "string"
              ? `Bearer ${auth.token}`
              : client.handshake.headers.authorization,
        "x-dev-auth-context":
          typeof auth?.devAuthContext === "string"
            ? auth.devAuthContext
            : client.handshake.headers["x-dev-auth-context"],
      },
    };

    return this.resolveRequest(requestLike);
  }

  private extractBearerToken(authorizationHeader: HeaderValue): string | null {
    if (typeof authorizationHeader !== "string") {
      return null;
    }

    const [scheme, token] = authorizationHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return null;
    }

    return token;
  }

  private async verifyOidcToken(token: string): Promise<RequestIdentity> {
    try {
      const { payload } = await jwtVerify(token, this.getJwks(), {
        issuer: this.authConfig.getIssuerUrl(),
        audience: this.authConfig.getAudience(),
      });

      return this.mapClaimsToIdentity(payload);
    } catch {
      throw new UnauthorizedException("Invalid or expired websocket token.");
    }
  }

  private getJwks() {
    if (!this.jwks) {
      this.jwks = createRemoteJWKSet(new URL(this.authConfig.getJwksUri()));
    }

    return this.jwks;
  }

  private parseDevHeader(headerValue: string): RequestIdentity {
    try {
      const decoded =
        headerValue.trim().startsWith("{")
          ? headerValue
          : Buffer.from(headerValue, "base64url").toString("utf8");

      const parsed = JSON.parse(decoded) as Partial<RequestIdentity>;

      if (!parsed.sub) {
        throw new Error("Missing sub");
      }

      const tenantMemberships = this.normalizeTenantMemberships(
        parsed.tenantMemberships,
      );
      const platformRoles = this.normalizePlatformRoles(parsed.platformRoles);
      const effectiveRoles = this.calculateEffectiveRoles(
        platformRoles,
        tenantMemberships,
        parsed.activeTenantId,
      );

      return {
        sub: parsed.sub,
        issuer: parsed.issuer ?? "dev-bypass",
        audiences: Array.isArray(parsed.audiences) ? parsed.audiences : [],
        scopes: Array.isArray(parsed.scopes) ? parsed.scopes : [],
        email: parsed.email,
        name: parsed.name,
        clientId: parsed.clientId,
        activeTenantId: parsed.activeTenantId,
        platformRoles,
        tenantMemberships,
        effectiveRoles,
        rawClaims:
          typeof parsed.rawClaims === "object" && parsed.rawClaims != null
            ? parsed.rawClaims
            : {},
      };
    } catch {
      throw new UnauthorizedException("Invalid x-dev-auth-context header.");
    }
  }

  private mapClaimsToIdentity(payload: JWTPayload): RequestIdentity {
    const rawClaims = payload as Record<string, unknown>;
    const platformRoles = this.extractPlatformRoles(rawClaims);
    const activeTenantId = this.getOptionalString(rawClaims.active_tenant);
    const tenantMemberships = this.extractTenantMemberships(rawClaims, activeTenantId);

    return {
      sub: payload.sub ?? "unknown",
      issuer: payload.iss ?? this.authConfig.getIssuerUrl(),
      audiences: this.normalizeAudience(payload.aud),
      scopes:
        typeof payload.scope === "string"
          ? payload.scope.split(" ").filter(Boolean)
          : [],
      email: this.getOptionalString(rawClaims.email),
      name: this.getOptionalString(rawClaims.name),
      clientId: this.getOptionalString(rawClaims.azp),
      activeTenantId,
      platformRoles,
      tenantMemberships,
      effectiveRoles: this.calculateEffectiveRoles(
        platformRoles,
        tenantMemberships,
        activeTenantId,
      ),
      rawClaims,
    };
  }

  private normalizeAudience(aud: string | string[] | undefined): string[] {
    if (typeof aud === "string") {
      return [aud];
    }

    return Array.isArray(aud) ? aud.filter((item) => typeof item === "string") : [];
  }

  private extractPlatformRoles(rawClaims: Record<string, unknown>) {
    const realmAccess = this.getObject(rawClaims.realm_access);
    const roles = this.getStringArray(realmAccess?.roles);

    return this.normalizePlatformRoles(roles);
  }

  private normalizePlatformRoles(input: unknown) {
    return this.getStringArray(input).filter(
      (role): role is RequestIdentity["platformRoles"][number] =>
        role === "platform_admin",
    );
  }

  private extractTenantMemberships(
    rawClaims: Record<string, unknown>,
    activeTenantId?: string,
  ) {
    const explicitMemberships = this.normalizeTenantMemberships(
      rawClaims.tenant_memberships,
    );

    if (explicitMemberships.length > 0) {
      return explicitMemberships;
    }

    const fallbackRoles = this.getStringArray(rawClaims.tenant_roles).filter(
      (role): role is RequestIdentity["tenantMemberships"][number]["roles"][number] =>
        role === "company_manager" || role === "employee",
    );

    if (!activeTenantId || fallbackRoles.length === 0) {
      return [];
    }

    return [
      {
        organizationId: activeTenantId,
        roles: fallbackRoles,
      },
    ];
  }

  private normalizeTenantMemberships(input: unknown) {
    if (!Array.isArray(input)) {
      return [];
    }

    return input.flatMap((item) => {
      const record = this.getObject(item);

      if (!record) {
        return [];
      }

      const organizationId = this.getOptionalString(record.organizationId);
      const roles = this.getStringArray(record.roles).filter(
        (role): role is RequestIdentity["tenantMemberships"][number]["roles"][number] =>
          role === "company_manager" || role === "employee",
      );

      if (!organizationId || roles.length === 0) {
        return [];
      }

      return [
        {
          organizationId,
          roles,
        },
      ];
    });
  }

  private calculateEffectiveRoles(
    platformRoles: RequestIdentity["platformRoles"],
    tenantMemberships: RequestIdentity["tenantMemberships"],
    activeTenantId?: string,
  ): RequestIdentity["effectiveRoles"] {
    const effectiveRoles = new Set<RequestIdentity["effectiveRoles"][number]>(
      platformRoles,
    );

    if (activeTenantId) {
      const activeMembership = tenantMemberships.find(
        (membership) => membership.organizationId === activeTenantId,
      );

      for (const role of activeMembership?.roles ?? []) {
        effectiveRoles.add(role);
      }
    }

    return Array.from(effectiveRoles);
  }

  private getStringArray(input: unknown): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input.filter((item): item is string => typeof item === "string");
  }

  private getObject(input: unknown): Record<string, unknown> | null {
    return typeof input === "object" && input != null && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : null;
  }

  private getOptionalString(input: unknown): string | undefined {
    return typeof input === "string" && input.trim().length > 0
      ? input
      : undefined;
  }
}
