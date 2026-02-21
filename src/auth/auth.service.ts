import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async login({ email, password }: LoginDto) {
    const { idToken, refreshToken, expiresIn } =
      await this.firebaseService.signInWithEmailAndPassword(email, password);

    return { idToken, refreshToken, expiresIn };
  }

  async logout(token: string) {
    if (!token) throw new BadRequestException('id token is required to logout');
    const { uid } = await this.firebaseService.verifyIdToken(token);
    return await this.firebaseService.revokeRefreshTokens(uid);
  }

  async refreshAuthToken(refreshToken: string) {
    return await this.firebaseService.refreshAuthToken(refreshToken);
  }

  async signup({ name, email, password, role }: SignupDto) {
    const userRecord = await this.firebaseService.createUser({
      email,
      password,
      displayName: name,
    });

    // set custom claims with role
    await this.firebaseService.setCustomUserClaims(userRecord.uid, { role });

    // create user document in Firestore
    await this.firebaseService.createDocument('users', userRecord.uid, {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    // sign in to return tokens
    const { idToken, refreshToken, expiresIn } =
      await this.firebaseService.signInWithEmailAndPassword(email, password);

    const user = {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      role,
    };

    return {
      user,
      accessToken: idToken,
      refreshToken,
      expiresIn,
    };
  }
}
