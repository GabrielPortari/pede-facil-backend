import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { SignupBusinessDto } from './dto/signup-business.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import * as admin from 'firebase-admin';
import { BusinessEntity } from 'src/business/entities/business.entity';
import { Business } from 'src/models/business.model';
import { User } from 'src/models/user.model';
import { BaseModel } from 'src/models/base.model';

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

    // persist user document using BaseModel mapper (adds serverTimestamp)
    const userModel = new User({ name, email, contact: dto.contact } as any);
    const userData = BaseModel.toFirestore(userModel);

    try {
      await this.firebaseService.createDocument(
        'users',
        userRecord.uid,
        userData,
      );
    } catch (err) {
      await this.firebaseService.deleteUser(userRecord.uid); // rollback
      throw err;
    }

    // sign in to return tokens; if signIn fails, rollback both auth user and firestore doc
    let tokens;
    try {
      tokens = await this.firebaseService.signInWithEmailAndPassword(
        email,
        password,
      );
    } catch (err) {
      // try to cleanup firestore and auth user
      try {
        await admin
          .firestore()
          .collection('users')
          .doc(userRecord.uid)
          .delete();
      } catch (e) {
        // ignore
      }
      await this.firebaseService.deleteUser(userRecord.uid);
      throw err;
    }

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

    // persist business using BusinessEntity mapper (adds serverTimestamp via BaseModel)
    const businessModel = new Business({
      name,
      email,
      contact: dto.contact,
      address: dto.address,
      // verified defaults to false in storage
    } as any);

    const businessData = BusinessEntity.toFirestore(businessModel as any);

    try {
      await this.firebaseService.createDocument(
        'businesses',
        userRecord.uid,
        businessData,
      );
    } catch (err) {
      await this.firebaseService.deleteUser(userRecord.uid);
      throw err;
    }

    // sign in to return tokens; if signIn fails, rollback both firestore doc and auth user
    let tokens;
    try {
      tokens = await this.firebaseService.signInWithEmailAndPassword(
        email,
        password,
      );
    } catch (err) {
      try {
        await admin
          .firestore()
          .collection('businesses')
          .doc(userRecord.uid)
          .delete();
      } catch (e) {
        // ignore
      }
      await this.firebaseService.deleteUser(userRecord.uid);
      throw err;
    }

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
