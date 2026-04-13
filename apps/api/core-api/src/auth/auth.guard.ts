import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AUTH_PUBLIC_KEY, AUTH_ROLES_KEY } from "./auth.decorators.js";
import { IdentityResolverService } from "./identity-resolver.service.js";
import type { RequestIdentity, SupportedRole } from "./auth.types.js";

type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  auth?: RequestIdentity;
};

@Injectable()
export class AuthenticationGuard implements CanActivate {
  public constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(IdentityResolverService)
    private readonly identityResolver: IdentityResolverService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = await this.identityResolver.resolveRequest(request);

    if (!identity) {
      throw new UnauthorizedException("Authentication is required.");
    }

    request.auth = identity;

    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return (
      this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false
    );
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  public constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
  ) {}

  public canActivate(context: ExecutionContext): boolean {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(AUTH_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isPublic) {
      return true;
    }

    const requiredRoles =
      this.reflector.getAllAndOverride<SupportedRole[]>(AUTH_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const identity = request.auth;

    if (!identity) {
      throw new UnauthorizedException("Missing authenticated identity.");
    }

    const allowed = requiredRoles.some((role) =>
      identity.effectiveRoles.includes(role),
    );

    if (!allowed) {
      throw new ForbiddenException("The current identity lacks required roles.");
    }

    return true;
  }
}
