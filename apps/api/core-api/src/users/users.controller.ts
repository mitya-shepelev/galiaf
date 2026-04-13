import { Controller, Get, Inject } from "@nestjs/common";
import { CurrentIdentity, Roles } from "../auth/auth.decorators.js";
import type { RequestIdentity } from "../auth/auth.types.js";
import { UsersService } from "./users.service.js";

@Controller("users")
export class UsersController {
  public constructor(
    @Inject(UsersService)
    private readonly users: UsersService,
  ) {}

  @Get()
  @Roles("platform_admin", "company_manager")
  public list(@CurrentIdentity() identity: RequestIdentity) {
    return this.users.list(identity);
  }

  @Get("me")
  public me(@CurrentIdentity() identity: RequestIdentity) {
    return this.users.me(identity);
  }
}
