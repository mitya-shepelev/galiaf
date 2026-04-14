import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import { AuthConfigService } from "./auth-config.service.js";
import { ChatBridgeTokenService } from "./chat-bridge-token.service.js";
import { CurrentIdentity, Public } from "./auth.decorators.js";
import type { RequestIdentity, SupportedRole } from "./auth.types.js";

interface SwitchContextDto {
  requestedRole: SupportedRole;
  targetTenantId?: string;
}

@Controller("auth")
export class AuthController {
  public constructor(
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
    @Inject(ChatBridgeTokenService)
    private readonly chatBridgeToken: ChatBridgeTokenService,
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Get("public-config")
  public publicConfig() {
    return this.authConfig.getPublicContract();
  }

  @Get("session")
  public session(@CurrentIdentity() identity: RequestIdentity) {
    return {
      subject: identity.sub,
      issuer: identity.issuer,
      clientId: identity.clientId,
      activeTenantId: identity.activeTenantId,
      platformRoles: identity.platformRoles,
      tenantMemberships: identity.tenantMemberships,
      effectiveRoles: identity.effectiveRoles,
      scopes: identity.scopes,
    };
  }

  @Get("chat-bridge-token")
  public createChatBridgeToken(@CurrentIdentity() identity: RequestIdentity) {
    return this.chatBridgeToken.issue(identity);
  }

  @Post("context/switch")
  public async switchContext(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: SwitchContextDto,
  ) {
    const requestedRole = payload.requestedRole;
    const targetTenantId = payload.targetTenantId?.trim() || identity.activeTenantId;

    if (requestedRole === "platform_admin") {
      if (!identity.platformRoles.includes("platform_admin")) {
        throw new ForbiddenException(
          "The current identity does not have platform_admin access.",
        );
      }

      await this.audit.record({
        action: "auth_context_switch_requested",
        entityType: "auth_context",
        entityId: identity.sub,
        actorIdentity: identity,
        details: {
          requestedRole,
          targetTenantId: undefined,
          clientId: identity.clientId,
        },
      });

      return {
        accepted: true,
        nextContext: {
          requestedRole,
        },
        note: "Production implementation should mint or refresh a session with the requested effective role.",
      };
    }

    if (!targetTenantId) {
      throw new BadRequestException(
        "targetTenantId is required for tenant-scoped role switching.",
      );
    }

    const membership = identity.tenantMemberships.find(
      (item) => item.organizationId === targetTenantId,
    );

    if (!membership || !membership.roles.includes(requestedRole)) {
      throw new ForbiddenException(
        "The current identity does not have the requested tenant role.",
      );
    }

    await this.audit.record({
      action: "auth_context_switch_requested",
      entityType: "auth_context",
      entityId: identity.sub,
      organizationId: targetTenantId,
      actorIdentity: identity,
      details: {
        requestedRole,
        targetTenantId,
        clientId: identity.clientId,
      },
    });

    return {
      accepted: true,
      nextContext: {
        requestedRole,
        targetTenantId,
      },
      note: "Production implementation should re-issue the auth context with updated active_tenant and effective roles.",
    };
  }
}
