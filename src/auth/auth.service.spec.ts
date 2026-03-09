import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { ConflictException } from '@nestjs/common';
import { Role } from 'src/constants/roles';
import { Collections } from 'src/constants/collections';

describe('AuthService - signupBusiness', () => {
  let service: AuthService;

  const firebaseMock = {
    signInWithEmailAndPassword: jest.fn(),
    verifyIdToken: jest.fn(),
    revokeRefreshTokens: jest.fn(),
    refreshAuthToken: jest.fn(),
    createUser: jest.fn(),
    setCustomUserClaims: jest.fn(),
    createDocument: jest.fn(),
    deleteUser: jest.fn(),
    existsByField: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: firebaseMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('deve criar business com sucesso e normalizar email/cnpj', async () => {
    firebaseMock.existsByField.mockResolvedValue(false);
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
  });

  it('deve retornar 409 quando cnpj ja estiver cadastrado', async () => {
    firebaseMock.existsByField
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

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
  });

  it('deve retornar 409 quando email ja estiver cadastrado', async () => {
    firebaseMock.existsByField
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

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
  });
});
