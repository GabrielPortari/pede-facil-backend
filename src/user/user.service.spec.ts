import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns sanitized user data for related business', async () => {
    const userDoc = { exists: true } as any;
    jest
      .spyOn(UserEntity, 'docRef')
      .mockReturnValue({ get: jest.fn().mockResolvedValue(userDoc) } as any);
    jest.spyOn(UserEntity, 'fromFirestore').mockReturnValue({
      id: 'user-1',
      name: 'Joao',
      email: 'joao@example.com',
      document: '12345678900',
      address: { city: 'Sao Paulo' },
      contact: '+5511999999999',
      createdAt: new Date('2026-03-10T15:00:00.000Z'),
      updatedAt: new Date('2026-03-11T16:00:00.000Z'),
    } as any);

    (service as any).hasBusinessRelationship = jest
      .fn()
      .mockResolvedValue(true);

    const result = await service.findOneForBusiness('user-1', 'biz-1');

    expect(result).toEqual({
      id: 'user-1',
      name: 'Joao',
      createdAt: new Date('2026-03-10T15:00:00.000Z'),
      updatedAt: new Date('2026-03-11T16:00:00.000Z'),
    });
    expect((result as any).email).toBeUndefined();
    expect((result as any).document).toBeUndefined();
    expect((result as any).address).toBeUndefined();
    expect((result as any).contact).toBeUndefined();
  });

  it('denies access when business has no relationship with user', async () => {
    (service as any).hasBusinessRelationship = jest
      .fn()
      .mockResolvedValue(false);

    await expect(
      service.findOneForBusiness('user-1', 'biz-2'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws not found when user does not exist even with relationship', async () => {
    const missingDoc = { exists: false } as any;
    jest
      .spyOn(UserEntity, 'docRef')
      .mockReturnValue({ get: jest.fn().mockResolvedValue(missingDoc) } as any);
    (service as any).hasBusinessRelationship = jest
      .fn()
      .mockResolvedValue(true);

    await expect(
      service.findOneForBusiness('user-404', 'biz-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
