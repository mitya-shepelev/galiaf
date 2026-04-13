import type {
  CreateInvitationRequest,
  InvitationAcceptanceResult,
} from "@galiaf/types";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { RequestIdentity } from "../auth/auth.types.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { DomainStoreService } from "../domain/domain-store.service.js";

@Injectable()
export class InvitationsService {
  public constructor(
    @Inject(DomainStoreService)
    private readonly store: DomainStoreService,
    @Inject(DomainAccessService)
    private readonly domainAccess: DomainAccessService,
  ) {}

  public async list(identity: RequestIdentity, organizationId?: string) {
    if (organizationId) {
      this.domainAccess.assertOrganizationAccess(identity, organizationId);
    }

    return this.domainAccess.listInvitations(identity, organizationId);
  }

  public async create(
    identity: RequestIdentity,
    payload: CreateInvitationRequest,
  ) {
    this.domainAccess.assertManagerForOrganization(
      identity,
      payload.organizationId,
    );

    const inviter = await this.domainAccess.getOrCreateCurrentUser(identity);
    const roles = this.domainAccess.normalizeMembershipRoles(payload.roles);

    return this.store.createInvitation({
      organizationId: payload.organizationId,
      email: payload.email,
      targetName: payload.targetName,
      roles,
      invitedByUserId: inviter.id,
    });
  }

  public async revoke(identity: RequestIdentity, invitationId: string) {
    const invitation = await this.store.findInvitationById(invitationId);

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    this.domainAccess.assertManagerForOrganization(
      identity,
      invitation.organizationId,
    );

    return this.store.updateInvitation(invitationId, {
      status: "revoked",
    });
  }

  public async accept(
    identity: RequestIdentity,
    invitationId: string,
  ): Promise<InvitationAcceptanceResult> {
    const invitation = await this.store.findInvitationById(invitationId);

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.status !== "pending") {
      throw new BadRequestException("Invitation is not pending.");
    }

    if (new Date(invitation.expiresAt).getTime() < Date.now()) {
      await this.store.updateInvitation(invitationId, {
        status: "expired",
      });

      throw new BadRequestException("Invitation has expired.");
    }

    const user = await this.domainAccess.getOrCreateCurrentUser(identity);

    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        "The authenticated user email does not match the invitation email.",
      );
    }

    const memberships = await this.store.getMemberships();
    const existingMembership = memberships.find(
      (membership) =>
        membership.userId === user.id &&
        membership.organizationId === invitation.organizationId &&
        membership.status === "active",
    );

    if (existingMembership) {
      const acceptedInvitation = await this.store.updateInvitation(invitationId, {
        status: "accepted",
        acceptedByUserId: user.id,
      });

      if (!acceptedInvitation) {
        throw new InternalServerErrorException(
          "Invitation disappeared during acceptance.",
        );
      }

      return {
        invitation: acceptedInvitation,
        membership: existingMembership,
      };
    }

    const membership = await this.store.createMembership({
      userId: user.id,
      organizationId: invitation.organizationId,
      roles: invitation.roles,
      invitedByUserId: invitation.invitedByUserId,
    });

    const acceptedInvitation = await this.store.updateInvitation(invitationId, {
      status: "accepted",
      acceptedByUserId: user.id,
    });

    if (!acceptedInvitation) {
      throw new InternalServerErrorException(
        "Invitation disappeared during acceptance.",
      );
    }

    return {
      invitation: acceptedInvitation,
      membership,
    };
  }
}
