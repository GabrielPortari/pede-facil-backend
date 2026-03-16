import { FirebaseService } from '../firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SignupBusinessDto } from './dto/signup-business.dto';
import { SignupUserDto } from './dto/signup-user.dto';
import * as admin from 'firebase-admin';
import { BusinessEntity } from 'src/business/entities/business.entity';
import { Business } from 'src/models/business.model';
import { User } from 'src/models/user.model';
import { BaseModel } from 'src/models/base.model';
import { Address } from 'src/models/address.model';
import { Collections } from 'src/constants/collections';
import { Role } from 'src/constants/roles';

@Injectable()
export class AuthService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async login({ email, password }: LoginDto) {
    try {
      const { idToken, refreshToken, expiresIn } =
        await this.firebaseService.signInWithEmailAndPassword(email, password);

      return { idToken, refreshToken, expiresIn };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnauthorizedException('Invalid credentials');
      }

      throw error;
    }
  }

  async logout(token: string) {
    if (!token) throw new BadRequestException('id token is required to logout');
    const { uid } = await this.firebaseService.verifyIdToken(token);
    return await this.firebaseService.revokeRefreshTokens(uid);
  }

  async refreshAuthToken(refreshToken: string) {
    try {
      return await this.firebaseService.refreshAuthToken(refreshToken);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      throw error;
    }
  }

  async recoverPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await this.firebaseService.sendPasswordResetEmail(normalizedEmail);
    } catch (error) {
      // Avoid user enumeration: keep response identical for invalid/non-existent emails.
      if (!(error instanceof BadRequestException)) {
        throw error;
      }
    }

    return { message: 'E-mail de recuperação enviado com sucesso.' };
  }

  async signupUser(dto: SignupUserDto) {
    const userRecord = await this.firebaseService.createUser({
      email: dto.email,
      password: dto.password,
      displayName: dto.name,
    });
    await this.firebaseService.setCustomUserClaims(userRecord.uid, {
      role: Role.USER,
    });

    // persist user document using BaseModel mapper (adds serverTimestamp)
    const userModel = new User({
      name: dto.name,
      email: dto.email,
      document: dto.document,
      contact: dto.contact,
      address: dto.address as Address,
    } as any);
    const userData = BaseModel.toFirestore(userModel);

    try {
      await this.firebaseService.createDocument(
        Collections.USERS,
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
        dto.email,
        dto.password,
      );
    } catch (err) {
      // try to cleanup firestore and auth user
      try {
        await admin
          .firestore()
          .collection(Collections.USERS)
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
        email: dto.email,
        name: dto.name,
        role: Role.USER,
      },
      ...tokens,
    };
  }

  async signupBusiness(dto: SignupBusinessDto) {
    const email = dto.email.trim().toLowerCase();
    const cnpj = this.normalizeCnpj(dto.cnpj);

    const uniquenessLocks = await this.acquireBusinessSignupLocks(email, cnpj);
    let shouldReleaseLocks = true;

    try {
      let userRecord;
      try {
        userRecord = await this.firebaseService.createUser({
          email,
          password: dto.password,
          displayName: dto.name,
        });
      } catch (err) {
        if (this.isDuplicateEmailError(err)) {
          throw new ConflictException('Email já cadastrado');
        }
        throw err;
      }

      await this.firebaseService.setCustomUserClaims(userRecord.uid, {
        role: Role.BUSINESS,
      });

      // persist business using BusinessEntity mapper (adds serverTimestamp via BaseModel)
      const businessModel = new Business({
        name: dto.name,
        legalName: dto.legalName,
        cnpj,
        website: dto.website,
        logoUrl: dto.logoUrl,
        email,
        contact: dto.contact,
        address: {
          address: dto.address.address,
          number: dto.address.number,
          complement: dto.address.complement,
          neighborhood: dto.address.neighborhood,
          city: dto.address.city,
          state: dto.address.state.toUpperCase(),
          zipcode: dto.address.zipcode,
        } as Address,
        verified: false,
        active: false,
      } as any);

      const businessData = BusinessEntity.toFirestore(
        businessModel as Business,
      );

      try {
        await this.firebaseService.createDocument(
          Collections.BUSINESSES,
          userRecord.uid,
          businessData,
        );
      } catch (err) {
        await this.firebaseService.deleteUser(userRecord.uid);
        throw err;
      }

      // sign in to return tokens; if signIn fails, rollback both firestore doc and auth user
      let tokens: any;
      try {
        tokens = await this.firebaseService.signInWithEmailAndPassword(
          email,
          dto.password,
        );
      } catch (err) {
        try {
          await admin
            .firestore()
            .collection(Collections.BUSINESSES)
            .doc(userRecord.uid)
            .delete();
        } catch (e) {
          // ignore
        }
        await this.firebaseService.deleteUser(userRecord.uid);
        throw err;
      }

      shouldReleaseLocks = false;

      return {
        user: {
          uid: userRecord.uid,
          email,
          name: dto.name,
          role: Role.BUSINESS,
        },
        ...tokens,
      };
    } finally {
      if (shouldReleaseLocks) {
        await this.releaseBusinessSignupLocks(uniquenessLocks);
      }
    }
  }

  private normalizeCnpj(cnpj: string) {
    return cnpj.replace(/\D/g, '');
  }

  private async acquireBusinessSignupLocks(email: string, cnpj: string) {
    const db = admin.firestore();
    const emailLockDocId = this.buildSignupLockDocId('email', email);
    const cnpjLockDocId = this.buildSignupLockDocId('cnpj', cnpj);

    const emailLockRef = db.collection(Collections.TOKENS).doc(emailLockDocId);
    const cnpjLockRef = db.collection(Collections.TOKENS).doc(cnpjLockDocId);

    await db.runTransaction(async (tx) => {
      const [emailLockDoc, cnpjLockDoc] = await Promise.all([
        tx.get(emailLockRef),
        tx.get(cnpjLockRef),
      ]);

      if (emailLockDoc.exists) {
        throw new ConflictException('Email já cadastrado');
      }

      if (cnpjLockDoc.exists) {
        throw new ConflictException('CNPJ já cadastrado');
      }

      const [businessByEmail, userByEmail, businessByCnpj] = await Promise.all([
        tx.get(
          db
            .collection(Collections.BUSINESSES)
            .where('email', '==', email)
            .limit(1),
        ),
        tx.get(
          db.collection(Collections.USERS).where('email', '==', email).limit(1),
        ),
        tx.get(
          db
            .collection(Collections.BUSINESSES)
            .where('cnpj', '==', cnpj)
            .limit(1),
        ),
      ]);

      if (!businessByCnpj.empty) {
        throw new ConflictException('CNPJ já cadastrado');
      }

      if (!businessByEmail.empty || !userByEmail.empty) {
        throw new ConflictException('Email já cadastrado');
      }

      tx.set(emailLockRef, {
        type: 'signup_business_email',
        value: email,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      tx.set(cnpjLockRef, {
        type: 'signup_business_cnpj',
        value: cnpj,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { emailLockDocId, cnpjLockDocId };
  }

  private async releaseBusinessSignupLocks(locks: {
    emailLockDocId: string;
    cnpjLockDocId: string;
  }) {
    const db = admin.firestore();
    await Promise.all([
      db.collection(Collections.TOKENS).doc(locks.emailLockDocId).delete(),
      db.collection(Collections.TOKENS).doc(locks.cnpjLockDocId).delete(),
    ]);
  }

  private buildSignupLockDocId(type: 'email' | 'cnpj', value: string) {
    const normalized = Buffer.from(value).toString('base64url');
    return `signup_business_${type}_${normalized}`;
  }

  private isDuplicateEmailError(error: unknown) {
    if (!(error instanceof BadRequestException)) return false;

    const response = error.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : Array.isArray((response as any)?.message)
          ? (response as any).message.join(' ')
          : (response as any)?.message || error.message;

    return String(message).toLowerCase().includes('email');
  }
}
