import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { SignJWT } from "jose";
import type { RequestIdentity } from "./auth.types.js";
import { AuthConfigService } from "./auth-config.service.js";

@Injectable()
export class ChatBridgeTokenService {
  public constructor(
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
  ) {}

  public async issue(identity: RequestIdentity): Promise<{
    token: string;
    expiresAt: string;
  }> {
    const sharedSecret = this.authConfig.getChatBridgeSharedSecret();

    if (!sharedSecret) {
      throw new ServiceUnavailableException(
        "CHAT_BRIDGE_SHARED_SECRET is not configured.",
      );
    }

    const ttlSeconds = this.authConfig.getChatBridgeTtlSeconds();
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + ttlSeconds;
    const token = await new SignJWT({
      email: identity.email,
      name: identity.name,
      azp: identity.clientId,
      scope: identity.scopes.join(" "),
      realm_access: {
        roles: identity.platformRoles,
      },
      active_tenant: identity.activeTenantId,
      tenant_memberships: identity.tenantMemberships,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer(this.authConfig.getChatBridgeIssuer())
      .setAudience(this.authConfig.getChatAudience())
      .setSubject(identity.sub)
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(new TextEncoder().encode(sharedSecret));

    return {
      token,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    };
  }
}
