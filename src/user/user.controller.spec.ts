import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { FirebaseService } from 'src/firebase/firebase.service';

describe('UserController', () => {
  let controller: UserController;
  const userServiceMock = {
    findOneForBusiness: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: UserService, useValue: userServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findOne uses authenticated business id to enforce relationship', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'biz-1' });
    userServiceMock.findOneForBusiness.mockResolvedValue({
      id: 'user-1',
      name: 'Joao',
    });

    const result = await controller.findOne('user-1', 'token');

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(userServiceMock.findOneForBusiness).toHaveBeenCalledWith(
      'user-1',
      'biz-1',
    );
    expect(result).toEqual({ id: 'user-1', name: 'Joao' });
  });
});
