import { Module } from "@nestjs/common";
import { DomainModule } from "../domain/domain.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";

@Module({
  imports: [DomainModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
