import {
  CanActivate,
  ExecutionContext,
  Injectable,
  mixin,
  Type,
} from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';
import { RoleType } from 'src/constants/roles';

export function RolesGuard(...allowedRoles: RoleType[]): Type<CanActivate> {
  @Injectable()
  class RoleGuardMixin implements CanActivate {
    constructor(private readonly firebaseService: FirebaseService) {}

    async canActivate(context: ExecutionContext) {
      const request = context.switchToHttp().getRequest();
      const authHeader =
        request.headers['authorization'] || request.headers['Authorization'];
      if (!authHeader) {
        return false;
      }

      const [bearer, token] = authHeader.split(' ');
      if (bearer !== 'Bearer' || !token) {
        return false;
      }

      try {
        const decodedToken = await this.firebaseService.verifyIdToken(
          token,
          true,
        );
        const userRoles = [
          ...(Array.isArray((decodedToken as any).roles)
            ? (decodedToken as any).roles
            : []),
          ...((decodedToken as any).role ? [(decodedToken as any).role] : []),
        ];

        return allowedRoles.some((required) => userRoles.includes(required));
      } catch {
        return false;
      }
    }
  }

  return mixin(RoleGuardMixin);
}
