import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { InvitationsController } from "./invitations.controller.js";
import { InvitationsService } from "./invitations.service.js";

@Module({
  imports: [DomainModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, DomainAccessService],
})
export class InvitationsModule {}
