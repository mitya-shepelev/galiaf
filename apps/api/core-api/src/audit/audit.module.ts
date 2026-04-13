import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { AuditController } from "./audit.controller.js";
import { AuditService } from "./audit.service.js";

@Module({
  imports: [DomainModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
