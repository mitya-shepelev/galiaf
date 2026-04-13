import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import type {
  CreateOrganizationEmployeeRequest,
  CreateOrganizationRequest,
} from "@galiaf/types";
import { Roles, CurrentIdentity } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { OrganizationsService } from "./organizations.service.js";

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
  public create(@Body() payload: CreateOrganizationRequest) {
    return this.organizations.create(payload);
  }

  @Roles("platform_admin", "company_manager")
  @Post(":organizationId/employees")
  public createEmployee(
    @CurrentIdentity() identity: RequestIdentity,
    @Param("organizationId") organizationId: string,
    @Body() payload: CreateOrganizationEmployeeRequest,
  ) {
    return this.organizations.createEmployee(identity, organizationId, payload);
  }
}
