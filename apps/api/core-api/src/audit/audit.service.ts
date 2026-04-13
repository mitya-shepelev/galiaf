import type { AuditEventAction, AuditEventRecord } from "@galiaf/types";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { DomainStoreService } from "../domain/domain-store.service.js";

interface RecordAuditInput {
  action: AuditEventAction;
  entityType: string;
  entityId: string;
  organizationId?: string;
  actorIdentity: RequestIdentity;
  actorUserId?: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
  ) {}

  public async list(
    identity: RequestIdentity,
    input: {
      organizationId?: string;
      limit?: number;
    },
  ): Promise<AuditEventRecord[]> {
    const limit = this.normalizeLimit(input.limit);

    if (identity.effectiveRoles.includes("platform_admin")) {
      return this.store.listAuditEvents({
        organizationId: input.organizationId,
        limit,
      });
    }

    const organizationId =
      input.organizationId?.trim() || identity.activeTenantId;

    if (!organizationId) {
      throw new BadRequestException(
        "organizationId is required for tenant-scoped audit access.",
      );
    }

    this.domainAccess.assertManagerForOrganization(identity, organizationId);

    return this.store.listAuditEvents({
      organizationId,
      limit,
    });
  }

  public async record(input: RecordAuditInput): Promise<void> {
    const actorUser =
      input.actorUserId
        ? await this.store.findUserById(input.actorUserId)
        : await this.store.findUserBySubject(input.actorIdentity.sub);

    await this.store.createAuditEvent({
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      organizationId: input.organizationId,
      actorSubject: input.actorIdentity.sub,
      actorUserId: actorUser?.id,
      actorEmail: input.actorIdentity.email ?? actorUser?.email,
      actorName: input.actorIdentity.name ?? actorUser?.fullName,
      actorRoles: input.actorIdentity.effectiveRoles,
      actorActiveTenantId: input.actorIdentity.activeTenantId,
      details: input.details ?? {},
    });
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return 50;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), 200);
  }
}
