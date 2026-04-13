import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { AccessController } from "./access/access.controller.js";
import { DomainModule } from "./domain/domain.module.js";
import { HealthController } from "./health/health.controller.js";
import { InvitationsModule } from "./invitations/invitations.module.js";
import { MembershipsModule } from "./memberships/memberships.module.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { PlatformModule } from "./platform/platform.module.js";
import { UsersModule } from "./users/users.module.js";

@Module({
  imports: [
    PlatformModule,
    AuthModule,
    DomainModule,
    OrganizationsModule,
    UsersModule,
    MembershipsModule,
    InvitationsModule,
  ],
  controllers: [HealthController, AccessController],
})
export class AppModule {}
