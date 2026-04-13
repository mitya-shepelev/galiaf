import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { InvitationsService } from "./invitations.service.js";

interface CreateInvitationDto {
  organizationId: string;
  email: string;
  targetName?: string;
  roles: Array<"company_manager" | "employee">;
}

@Controller("invitations")
export class InvitationsController {
  public constructor(
    @Inject(InvitationsService)
    private readonly invitations: InvitationsService,
  ) {}

  @Get()
  @Roles("platform_admin", "company_manager")
  public list(
    @CurrentIdentity() identity: RequestIdentity,
    @Query("organizationId") organizationId?: string,
  ) {
    return this.invitations.list(identity, organizationId);
  }

  @Post()
  @Roles("platform_admin", "company_manager")
  public create(
    @CurrentIdentity() identity: RequestIdentity,
    @Body() payload: CreateInvitationDto,
  ) {
    return this.invitations.create(identity, payload);
  }

  @Patch(":invitationId/revoke")
  @Roles("platform_admin", "company_manager")
  public revoke(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("invitationId") invitationId: string,
  ) {
    return this.invitations.revoke(identity, invitationId);
  }

  @Post(":invitationId/accept")
  public accept(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("invitationId") invitationId: string,
  ) {
    return this.invitations.accept(identity, invitationId);
  }
}
