import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { Roles, CurrentIdentity } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { OrganizationsService } from "./organizations.service.js";

interface CreateOrganizationDto {
  name: string;
  status?: "active" | "suspended";
}

@Controller("organizations")
export class OrganizationsController {
  public constructor(
    @Inject(OrganizationsService)
    private readonly organizations: OrganizationsService,
  ) {}

  @Get()
  public list(@CurrentIdentity() identity: RequestIdentity) {
    return this.organizations.list(identity);
  }

  @Get(":organizationId")
  public byId(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("organizationId") organizationId: string,
  ) {
    return this.organizations.getById(identity, organizationId);
  }

  @Roles("platform_admin")
  @Post()
  public create(@Body() payload: CreateOrganizationDto) {
    return this.organizations.create(payload);
  }
}
