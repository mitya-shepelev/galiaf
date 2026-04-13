import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { DomainModule } from "../domain/domain.module.js";
import { MembershipsController } from "./memberships.controller.js";
import { MembershipsService } from "./memberships.service.js";

@Module({
  imports: [DomainModule, AuditModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
