import { Module } from "@nestjs/common";
import { DomainStoreService } from "./domain-store.service.js";
import { PlatformModule } from "../platform/platform.module.js";

@Module({
  imports: [PlatformModule],
  providers: [DomainStoreService],
  exports: [DomainStoreService],
})
export class DomainModule {}
