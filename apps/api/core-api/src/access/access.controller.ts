import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { AuditService } from "../audit/audit.service.js";

@Controller("access")
export class AccessController {
  public constructor(
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  @Get("roles")
  public roles(@CurrentIdentity() identity: RequestIdentity) {
    return {
      subject: identity.sub,
      platformRoles: identity.platformRoles,
      tenantMemberships: identity.tenantMemberships,
      activeTenantId: identity.activeTenantId,
      effectiveRoles: identity.effectiveRoles,
    };
  }

  @Roles("platform_admin")
  @Get("admin/bootstrap")
  public async adminBootstrap(@CurrentIdentity() identity: RequestIdentity) {
    const payload = {
      dashboard: "platform-admin",
      subject: identity.sub,
      allowedAreas: [
        "organizations",
        "global-settings",
        "audit-log",
        "service-health",
      ],
    };

    await this.audit.record({
      action: "admin_bootstrap_viewed",
      entityType: "admin_bootstrap",
      entityId: payload.dashboard,
      actorIdentity: identity,
      details: {
        allowedAreas: payload.allowedAreas,
        clientId: identity.clientId,
      },
    });

    return payload;
  }

  @Roles("company_manager", "employee")
  @Get("workspace")
  public workspace(@CurrentIdentity() identity: RequestIdentity) {
    return {
      subject: identity.sub,
      activeTenantId: identity.activeTenantId,
      effectiveRoles: identity.effectiveRoles,
      availableMemberships: identity.tenantMemberships,
    };
  }
}
