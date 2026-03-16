import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from 'src/constants/roles';
import { Collections } from 'src/constants/collections';
import * as admin from 'firebase-admin';

describe('AuthService - signupBusiness', () => {
  let service: AuthService;
  let firestoreState: {
    emailLockExists: boolean;
    cnpjLockExists: boolean;
    businessEmailExists: boolean;
    userEmailExists: boolean;
    businessCnpjExists: boolean;
  };
  let tokenDocs: Set<string>;

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

  function buildFirestoreMock() {
    const createQuery = (collection: string, field: string, value: string) => ({
      __kind: 'query',
      collection,
      field,
      value,
    });

    const tx = {
      get: jest.fn(async (ref: any) => {
        if (ref?.__kind === 'token-doc') {
          return { exists: tokenDocs.has(ref.id) };
        }

        if (ref?.__kind === 'query') {
          const empty = (() => {
            if (
              ref.collection === Collections.BUSINESSES &&
              ref.field === 'email'
            ) {
              return !firestoreState.businessEmailExists;
            }

            if (ref.collection === Collections.USERS && ref.field === 'email') {
              return !firestoreState.userEmailExists;
            }

            if (
              ref.collection === Collections.BUSINESSES &&
              ref.field === 'cnpj'
            ) {
              return !firestoreState.businessCnpjExists;
            }

            return true;
          })();

          return { empty };
        }

        throw new Error('Unexpected tx.get input');
      }),
      set: jest.fn((ref: any) => {
        tokenDocs.add(ref.id);
      }),
    };

    return {
      runTransaction: jest.fn(async (handler: any) => {
        return handler(tx);
      }),
      collection: jest.fn((name: string) => ({
        doc: (id: string) => ({
          __kind: name === Collections.TOKENS ? 'token-doc' : 'doc-ref',
          id,
          delete: jest.fn(async () => {
            tokenDocs.delete(id);
          }),
        }),
        where: (field: string, _op: string, value: string) => ({
          limit: (_n: number) => createQuery(name, field, value),
        }),
      })),
      FieldValue: admin.firestore.FieldValue,
    } as any;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    firestoreState = {
      emailLockExists: false,
      cnpjLockExists: false,
      businessEmailExists: false,
      userEmailExists: false,
      businessCnpjExists: false,
    };
    tokenDocs = new Set<string>();

    jest.spyOn(admin, 'firestore').mockReturnValue(buildFirestoreMock());
    (admin.firestore as any).FieldValue = {
      serverTimestamp: jest.fn(() => '__ts__'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: firebaseMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve criar business com sucesso e normalizar email/cnpj', async () => {
    firebaseMock.createUser.mockResolvedValue({ uid: 'business-uid' });
    firebaseMock.setCustomUserClaims.mockResolvedValue(undefined);
    firebaseMock.createDocument.mockResolvedValue(undefined);
    firebaseMock.signInWithEmailAndPassword.mockResolvedValue({
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '3600',
    });

    const result = await service.signupBusiness({
      name: 'Cafe Centro',
      legalName: 'Cafe Centro LTDA',
      cnpj: '12.345.678/0001-95',
      website: 'https://cafecentro.com.br',
      logoUrl: 'https://cdn.site/logo.png',
      contact: '+5511999999999',
      email: 'CONTATO@CAFECENTRO.COM.BR',
      password: 'senhaForte123',
      address: {
        address: 'Rua A',
        number: '123',
        complement: 'Sala 1',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'sp',
        zipcode: '01001-000',
      },
    });

    expect(firebaseMock.createUser).toHaveBeenCalledWith({
      email: 'contato@cafecentro.com.br',
      password: 'senhaForte123',
      displayName: 'Cafe Centro',
    });
    expect(firebaseMock.setCustomUserClaims).toHaveBeenCalledWith(
      'business-uid',
      { role: Role.BUSINESS },
    );
    expect(firebaseMock.createDocument).toHaveBeenCalledWith(
      Collections.BUSINESSES,
      'business-uid',
      expect.objectContaining({
        name: 'Cafe Centro',
        legalName: 'Cafe Centro LTDA',
        cnpj: '12345678000195',
        website: 'https://cafecentro.com.br',
        email: 'contato@cafecentro.com.br',
        address: expect.objectContaining({
          state: 'SP',
        }),
      }),
    );
    expect(result.user).toEqual({
      uid: 'business-uid',
      email: 'contato@cafecentro.com.br',
      name: 'Cafe Centro',
      role: Role.BUSINESS,
    });

    expect(tokenDocs.size).toBe(2);
  });

  it('deve retornar 409 quando cnpj ja estiver cadastrado', async () => {
    firestoreState.businessCnpjExists = true;

    await expect(
      service.signupBusiness({
        name: 'Cafe Centro',
        legalName: 'Cafe Centro LTDA',
        cnpj: '12345678000195',
        contact: '+5511999999999',
        email: 'contato@cafecentro.com.br',
        password: 'senhaForte123',
        address: {
          address: 'Rua A',
          number: '123',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001-000',
        },
      } as any),
    ).rejects.toThrow(new ConflictException('CNPJ já cadastrado'));

    expect(firebaseMock.createUser).not.toHaveBeenCalled();
  });

  it('deve retornar 409 quando email ja estiver cadastrado', async () => {
    firestoreState.userEmailExists = true;

    await expect(
      service.signupBusiness({
        name: 'Cafe Centro',
        legalName: 'Cafe Centro LTDA',
        cnpj: '12345678000195',
        contact: '+5511999999999',
        email: 'contato@cafecentro.com.br',
        password: 'senhaForte123',
        address: {
          address: 'Rua A',
          number: '123',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001-000',
        },
      } as any),
    ).rejects.toThrow(new ConflictException('Email já cadastrado'));

    expect(firebaseMock.createUser).not.toHaveBeenCalled();
  });

  it('deve liberar locks quando signup falha apos reservar unicidade', async () => {
    firebaseMock.createUser.mockResolvedValue({ uid: 'business-uid' });
    firebaseMock.setCustomUserClaims.mockResolvedValue(undefined);
    firebaseMock.createDocument.mockResolvedValue(undefined);
    firebaseMock.signInWithEmailAndPassword.mockRejectedValue(
      new Error('sign-in-failed'),
    );

    await expect(
      service.signupBusiness({
        name: 'Cafe Centro',
        legalName: 'Cafe Centro LTDA',
        cnpj: '12345678000195',
        contact: '+5511999999999',
        email: 'contato@cafecentro.com.br',
        password: 'senhaForte123',
        address: {
          address: 'Rua A',
          number: '123',
          neighborhood: 'Centro',
          city: 'Sao Paulo',
          state: 'SP',
          zipcode: '01001-000',
        },
      } as any),
    ).rejects.toThrow('sign-in-failed');

    expect(tokenDocs.size).toBe(0);
  });

  it('deve enviar email de recuperacao de senha', async () => {
    firebaseMock.sendPasswordResetEmail.mockResolvedValue(undefined);

    const result = await service.recoverPassword(' USUARIO@EXEMPLO.COM ');

    expect(firebaseMock.sendPasswordResetEmail).toHaveBeenCalledWith(
      'usuario@exemplo.com',
    );
    expect(result).toEqual({
      message: 'E-mail de recuperação enviado com sucesso.',
    });
  });

  it('deve retornar erro generico de credenciais no login invalido', async () => {
    firebaseMock.signInWithEmailAndPassword.mockRejectedValue(
      new BadRequestException('EMAIL_NOT_FOUND'),
    );

    await expect(
      service.login({ email: 'naoexiste@example.com', password: 'errada123' }),
    ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
  });

  it('deve retornar erro generico para refresh token invalido', async () => {
    firebaseMock.refreshAuthToken.mockRejectedValue(
      new BadRequestException('INVALID_REFRESH_TOKEN'),
    );

    await expect(service.refreshAuthToken('bad-token')).rejects.toThrow(
      new UnauthorizedException('Invalid refresh token'),
    );
  });

  it('deve responder sucesso no recover mesmo para email invalido', async () => {
    firebaseMock.sendPasswordResetEmail.mockRejectedValue(
      new BadRequestException('EMAIL_NOT_FOUND'),
    );

    const result = await service.recoverPassword('naoexiste@example.com');

    expect(result).toEqual({
      message: 'E-mail de recuperação enviado com sucesso.',
    });
  });
});
