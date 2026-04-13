import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module.js";
import { DomainModule } from "../domain/domain.module.js";
import { InvitationsController } from "./invitations.controller.js";
import { InvitationsService } from "./invitations.service.js";

@Module({
  imports: [DomainModule, AuditModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
