import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { DomainModule } from "../domain/domain.module.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [DomainModule, AuditModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
