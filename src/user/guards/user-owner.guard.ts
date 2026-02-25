import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class UserOwnerGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader) return false;

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) return false;

    try {
      const decoded = await this.firebaseService.verifyIdToken(token, true);
      const uid = decoded.uid;

      // prefer explicit params (id or userId)
      const targetId = request.params?.id ?? request.params?.userId;
      if (targetId) return uid === targetId;

      // support '/me' style routes: if the route is '/me' allow any authenticated user
      if (request.path && request.path.endsWith('/me')) return true;

      return false;
    } catch {
      return false;
    }
  }
}
