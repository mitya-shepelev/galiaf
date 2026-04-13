import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [DomainModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, DomainAccessService],
})
export class OrganizationsModule {}
