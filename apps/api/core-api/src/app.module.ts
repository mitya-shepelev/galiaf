import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { AuditModule } from "./audit/audit.module.js";
import { AccessController } from "./access/access.controller.js";
import { DomainModule } from "./domain/domain.module.js";
import { HealthController } from "./health/health.controller.js";
import { InvitationsModule } from "./invitations/invitations.module.js";
import { MembershipsModule } from "./memberships/memberships.module.js";
import { MetricsController } from "./metrics/metrics.controller.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { PlatformModule } from "./platform/platform.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    PlatformModule,
    AuthModule,
    AuditModule,
    DomainModule,
    OrganizationsModule,
    UsersModule,
    MembershipsModule,
    InvitationsModule,
  ],
  controllers: [HealthController, MetricsController, AccessController],
})
export class AppModule {}
