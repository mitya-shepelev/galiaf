import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthConfigService } from "./auth-config.service.js";
import { AuthController } from "./auth.controller.js";
import { AuthenticationGuard, RolesGuard } from "./auth.guard.js";
import { IdentityResolverService } from "./identity-resolver.service.js";

@Module({
  controllers: [AuthController],
  providers: [
    AuthConfigService,
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
  exports: [AuthConfigService, IdentityResolverService],
})
export class AuthModule {}
