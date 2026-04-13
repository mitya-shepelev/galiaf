import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { DomainAccessService } from "../domain/domain-access.service.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [DomainModule],
  controllers: [UsersController],
  providers: [UsersService, DomainAccessService],
})
export class UsersModule {}
