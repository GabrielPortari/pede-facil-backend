import { DynamicModule, Global, Inject, Module } from '@nestjs/common';
import { FirebaseConfigService } from './firebase-config-service';
import { ConfigService } from '@nestjs/config';
import * as firebaseAdmin from 'firebase-admin';
import { FirebaseService } from './firebase.service';

@Global()
@Module({})
export class FirebaseModule {
  static forRoot(): DynamicModule {
    const firebaseConfigProvider = {
      provide: FirebaseConfigService,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('FIREBASE_API_KEY');
        if (!apiKey) {
          throw new Error(
            'FIREBASE_API_KEY is not defined in environment variables',
          );
        }
        return new FirebaseConfigService(apiKey);
      },
    };

    const firebaseProvider = {
      provide: 'FIREBASE_ADMIN',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const credentials = configService.get<string>(
          'FIREBASE_ADMIN_CREDENTIALS',
        );
        if (!credentials) {
          throw new Error(
            'FIREBASE_ADMIN_CREDENTIALS is not defined in environment variables',
          );
        }

        const serviceAccount = JSON.parse(credentials);
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(serviceAccount),
        });

        return firebaseAdmin;
      },
    };

    const firestoreProvider = {
      provide: 'FIRESTORE',
      inject: ['FIREBASE_ADMIN'],
      useFactory: (firebaseAdminInstance: typeof firebaseAdmin) => {
        const fsInstance = firebaseAdminInstance.firestore();
        try {
          fsInstance.settings({ ignoreUndefinedProperties: true });
        } catch (e) {
          // ignore if settings not supported in this environment/version
        }
        return fsInstance;
      },
    };

    return {
      module: FirebaseModule,
      providers: [
        firebaseConfigProvider,
        firebaseProvider,
        firestoreProvider,
        FirebaseService,
      ],
      exports: [
        firebaseConfigProvider,
        firebaseProvider,
        firestoreProvider,
        FirebaseService,
      ],
    };
  }
}
