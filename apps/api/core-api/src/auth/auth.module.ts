import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuditModule } from "../audit/audit.module.js";
import { DomainModule } from "../domain/domain.module.js";
import { AuthConfigService } from "./auth-config.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthenticationGuard, RolesGuard } from "./auth.guard.js";
import { ChatBridgeTokenService } from "./chat-bridge-token.service.js";
import { IdentityResolverService } from "./identity-resolver.service.js";

@Module({
  imports: [AuditModule, DomainModule],
  controllers: [AuthController],
  providers: [
    AuthConfigService,
    ChatBridgeTokenService,
    IdentityResolverService,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthConfigService, ChatBridgeTokenService, IdentityResolverService],
})
export class AuthModule {}
