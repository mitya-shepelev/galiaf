import { Controller, Get, Inject, Query } from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { AuditService } from "./audit.service.js";

@Controller("audit")
export class AuditController {
  public constructor(
    @Inject(AuditService)
    private readonly audit: AuditService,
  ) {}

  @Get("events")
  @Roles("platform_admin", "company_manager")
  public async list(
    @CurrentIdentity() identity: RequestIdentity,
    @Query("organizationId") organizationId?: string,
    @Query("limit") limit?: string,
  ) {
    const normalizedLimit = limit ? Number(limit) : undefined;
    const events = await this.audit.list(identity, {
      organizationId,
      limit: normalizedLimit,
    });

    await this.audit.record({
      action: "audit_events_viewed",
      entityType: "audit_log",
      entityId: organizationId?.trim() || "platform",
      organizationId: organizationId?.trim() || undefined,
      actorIdentity: identity,
      details: {
        requestedOrganizationId: organizationId?.trim() || null,
        limit: normalizedLimit ?? 50,
        returnedCount: events.length,
      },
    });

    return events;
  }
}
