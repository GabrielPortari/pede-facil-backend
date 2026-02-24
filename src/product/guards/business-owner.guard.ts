import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class BusinessOwnerGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const businessId = request.params?.businessId;
    const authHeader =
      request.headers['authorization'] || request.headers['Authorization'];

    if (!businessId || !authHeader) return false;

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) return false;

    try {
      const decoded = await this.firebaseService.verifyIdToken(token, true);
      return decoded.uid === businessId;
    } catch {
      return false;
    }
  }
}
