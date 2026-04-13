import { Controller, Get, Inject } from "@nestjs/common";
import { AuthConfigService } from "./auth-config.service.js";

@Controller("auth")
export class ChatAuthController {
  public constructor(
    @Inject(AuthConfigService)
    private readonly authConfig: AuthConfigService,
  ) {}

  @Get("public-config")
  public publicConfig() {
    return this.authConfig.getPublicContract();
  }
}
