import { Controller, Get } from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";

@Controller("access")
export class AccessController {
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
  public adminBootstrap(@CurrentIdentity() identity: RequestIdentity) {
    return {
      dashboard: "platform-admin",
      subject: identity.sub,
      allowedAreas: [
        "organizations",
        "global-settings",
        "audit-log",
        "service-health",
      ],
    };
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
