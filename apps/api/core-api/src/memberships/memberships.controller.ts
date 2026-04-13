import { Body, Controller, Get, Inject, Param, Patch, Query } from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { MembershipsService } from "./memberships.service.js";

interface UpdateMembershipRolesDto {
  roles: Array<"company_manager" | "employee">;
}

@Controller("memberships")
export class MembershipsController {
  public constructor(
    @Inject(MembershipsService)
    private readonly memberships: MembershipsService,
  ) {}

  @Get()
  @Roles("platform_admin", "company_manager")
  public list(
    @CurrentIdentity() identity: RequestIdentity,
    @Query("organizationId") organizationId?: string,
  ) {
    return this.memberships.list(identity, organizationId);
  }

  @Patch(":membershipId/roles")
  @Roles("platform_admin", "company_manager")
  public updateRoles(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("membershipId") membershipId: string,
    @Body() payload: UpdateMembershipRolesDto,
  ) {
    return this.memberships.updateRoles(identity, membershipId, payload.roles);
  }

  @Patch(":membershipId/revoke")
  @Roles("platform_admin", "company_manager")
  public revoke(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("membershipId") membershipId: string,
  ) {
    return this.memberships.revoke(identity, membershipId);
  }
}
