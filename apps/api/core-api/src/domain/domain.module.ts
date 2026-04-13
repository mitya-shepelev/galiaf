import { Module } from "@nestjs/common";
import { DomainAccessService } from "./domain-access.service.js";
import { DomainStoreService } from "./domain-store.service.js";
import { PlatformModule } from "../platform/platform.module.js";

@Module({
  imports: [PlatformModule],
  providers: [DomainStoreService, DomainAccessService],
  exports: [DomainStoreService, DomainAccessService],
})
export class DomainModule {}
