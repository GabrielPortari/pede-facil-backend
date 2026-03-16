import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { FirebaseService } from '../src/firebase/firebase.service';
import { AuthRateLimitGuard } from '../src/auth/auth-rate-limit.guard';

describe('Auth hardening routine (e2e)', () => {
  let app: INestApplication<App>;

  const firebaseMock = {
    signInWithEmailAndPassword: jest.fn(),
    verifyIdToken: jest.fn(),
    revokeRefreshTokens: jest.fn(),
    refreshAuthToken: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    createUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    createDocument: jest.fn(),
    deleteUser: jest.fn(),
    existsByField: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    firebaseMock.signInWithEmailAndPassword.mockImplementation(
      async (email: string) => {
        if (email === 'valid@example.com') {
          return {
            idToken: 'id-token',
            refreshToken: 'refresh-token',
            expiresIn: '3600',
          };
        }
        throw new BadRequestException('EMAIL_NOT_FOUND');
      },
    );

    firebaseMock.refreshAuthToken.mockImplementation(async (token: string) => {
      if (token === 'valid-refresh-token') {
        return {
          idToken: 'new-id-token',
          refreshToken: 'new-refresh-token',
          expiresIn: '3600',
        };
      }
      throw new BadRequestException('INVALID_REFRESH_TOKEN');
    });

    firebaseMock.sendPasswordResetEmail.mockImplementation(
      async (email: string) => {
        if (email === 'valid@example.com') {
          return;
        }
        throw new BadRequestException('EMAIL_NOT_FOUND');
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: firebaseMock },
        AuthRateLimitGuard,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns generic error for invalid login (anti-enumeration)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'unknown@example.com', password: 'wrongpass123' })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('returns generic error for invalid refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh-auth')
      .send({ refreshToken: 'invalid-refresh' })
      .expect(401);

    expect(response.body.message).toBe('Invalid refresh token');
  });

  it('returns success for recover password even when email does not exist', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/recover-password')
      .send({ email: 'unknown@example.com' })
      .expect(200);

    expect(response.body).toEqual({
      message: 'E-mail de recuperação enviado com sucesso.',
    });
  });

  it('blocks brute force on login by identity', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'victim@example.com', password: 'wrongpass123' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'victim@example.com', password: 'wrongpass123' })
      .expect(429);
  });

  it('keeps different identities independent under same IP window', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: `victim${i}@example.com`, password: 'wrongpass123' })
        .expect(401);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'new-target@example.com', password: 'wrongpass123' })
      .expect(401);
  });
});
