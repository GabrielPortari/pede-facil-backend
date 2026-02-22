import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SignupBusinessDto } from './dto/signup-business.dto';
import { SignupUserDto } from './dto/signup-user.dto';

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

  async signupUser(dto: SignupUserDto) {
    const { email, password, name } = dto;
    const userRecord = await this.firebaseService.createUser({
      email,
      password,
      displayName: name,
    });
    await this.firebaseService.setCustomUserClaims(userRecord.uid, {
      role: 'user',
    });

    try {
      await this.firebaseService.createDocument('users', userRecord.uid, {
        name,
        email,
        contact: dto.contact,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      await this.firebaseService.deleteUser(userRecord.uid); // rollback
      throw err;
    }

    const tokens = await this.firebaseService.signInWithEmailAndPassword(
      email,
      password,
    );
    return {
      user: { uid: userRecord.uid, email, name, role: 'user' },
      ...tokens,
    };
  }

  async signupBusiness(dto: SignupBusinessDto) {
    const { email, password, name } = dto;
    const userRecord = await this.firebaseService.createUser({
      email,
      password,
      displayName: name,
    });
    await this.firebaseService.setCustomUserClaims(userRecord.uid, {
      role: 'business',
    });

    try {
      await this.firebaseService.createDocument('businesses', userRecord.uid, {
        name,
        email,
        contact: dto.contact,
        address: dto.address,
        verified: false, // sugestão: require approval
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      await this.firebaseService.deleteUser(userRecord.uid);
      throw err;
    }

    const tokens = await this.firebaseService.signInWithEmailAndPassword(
      email,
      password,
    );
    return {
      user: {
        uid: userRecord.uid,
        email,
        name,
        role: 'business',
      },
      ...tokens,
    };
  }
}
