import {
  INestApplication,
  ValidationPipe,
  ConflictException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { FirebaseService } from '../src/firebase/firebase.service';

describe('Auth signup/business (e2e)', () => {
  let app: INestApplication<App>;

  const authServiceMock = {
    login: jest.fn(),
    signupUser: jest.fn(),
    signupBusiness: jest.fn(),
    refreshAuthToken: jest.fn(),
    logout: jest.fn(),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
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

  it('deve retornar 201 para payload valido', async () => {
    authServiceMock.signupBusiness.mockResolvedValue({
      user: { uid: 'business-uid', role: 'BUSINESS' },
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    });

    await request(app.getHttpServer())
      .post('/auth/signup/business')
      .send({
        name: 'Cafe do Centro',
        legalName: 'Cafe do Centro LTDA',
        cnpj: '12345678000195',
        website: 'https://cafedocentro.com.br',
        logoUrl: 'https://cdn.exemplo.com/logo.png',
        contact: '+5511999999999',
        email: 'contato@cafedocentro.com.br',
        password: 'senhaForte123',
        address: {
          address: 'Rua das Flores',
          number: '123',
          complement: 'Sala 5',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001-000',
        },
      })
      .expect(201);

    expect(authServiceMock.signupBusiness).toHaveBeenCalledTimes(1);
  });

  it('deve retornar 400 para payload invalido', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup/business')
      .send({
        name: 'Cafe do Centro',
        cnpj: '123',
        contact: '11999999999',
        email: 'email-invalido',
        password: '123',
        address: {
          address: 'Rua das Flores',
          number: '123',
          city: 'Sao Paulo',
          state: 'Sao Paulo',
          zipcode: '0100',
        },
      })
      .expect(400);

    expect(response.body.message).toEqual(expect.any(Array));
    expect(authServiceMock.signupBusiness).not.toHaveBeenCalled();
  });

  it('deve retornar 409 quando houver cnpj/email duplicado', async () => {
    authServiceMock.signupBusiness.mockRejectedValueOnce(
      new ConflictException('CNPJ já cadastrado'),
    );

    await request(app.getHttpServer())
      .post('/auth/signup/business')
      .send({
        name: 'Cafe do Centro',
        legalName: 'Cafe do Centro LTDA',
        cnpj: '12345678000195',
        contact: '+5511999999999',
        email: 'contato@cafedocentro.com.br',
        password: 'senhaForte123',
        address: {
          address: 'Rua das Flores',
          number: '123',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001-000',
        },
      })
      .expect(409);
  });
});
