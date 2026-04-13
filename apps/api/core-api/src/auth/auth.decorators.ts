import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import type { RequestIdentity, SupportedRole } from "./auth.types.js";

export const AUTH_PUBLIC_KEY = "auth:is-public";
export const AUTH_ROLES_KEY = "auth:roles";

export const Public = () => SetMetadata(AUTH_PUBLIC_KEY, true);

export const Roles = (...roles: SupportedRole[]) =>
  SetMetadata(AUTH_ROLES_KEY, roles);

export const CurrentIdentity = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestIdentity | undefined => {
    const request = context.switchToHttp().getRequest<{
      auth?: RequestIdentity;
    }>();

    return request.auth;
  },
);
