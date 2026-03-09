import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authServiceMock = {
    recoverPassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: FirebaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call service on recover password', async () => {
    authServiceMock.recoverPassword.mockResolvedValue({
      message: 'E-mail de recuperação enviado com sucesso.',
    });

    const result = await controller.recoverPassword({
      email: 'usuario@exemplo.com',
    });

    expect(authServiceMock.recoverPassword).toHaveBeenCalledWith(
      'usuario@exemplo.com',
    );
    expect(result).toEqual({
      message: 'E-mail de recuperação enviado com sucesso.',
    });
  });
});
