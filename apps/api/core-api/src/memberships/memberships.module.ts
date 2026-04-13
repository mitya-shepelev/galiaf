import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { MembershipsController } from "./memberships.controller.js";
import { MembershipsService } from "./memberships.service.js";

@Module({
  imports: [DomainModule],
  controllers: [MembershipsController],
  providers: [MembershipsService, DomainAccessService],
})
export class MembershipsModule {}
