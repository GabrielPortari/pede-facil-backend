import { Test, TestingModule } from '@nestjs/testing';
import { BusinessOrderController } from './business-order.controller';
import { OrderService } from './order.service';
import { FirebaseService } from 'src/firebase/firebase.service';

describe('BusinessOrderController', () => {
  let controller: BusinessOrderController;

  const orderServiceMock = {
    listForBusiness: jest.fn(),
    findOneForBusiness: jest.fn(),
    updateStatusForBusiness: jest.fn(),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessOrderController],
      providers: [
        { provide: OrderService, useValue: orderServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
      ],
    }).compile();

    controller = module.get<BusinessOrderController>(BusinessOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findMine uses authenticated business id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'biz-1' });
    orderServiceMock.listForBusiness.mockResolvedValue([{ id: 'order-1' }]);

    const query = { status: 'payment_pending', limit: 10 } as any;
    const result = await controller.findMine('token', query);

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.listForBusiness).toHaveBeenCalledWith(
      'biz-1',
      query,
    );
    expect(result).toEqual([{ id: 'order-1' }]);
  });

  it('findOneMine uses authenticated business id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'biz-1' });
    orderServiceMock.findOneForBusiness.mockResolvedValue({ id: 'order-1' });

    const result = await controller.findOneMine('token', 'order-1');

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.findOneForBusiness).toHaveBeenCalledWith(
      'order-1',
      'biz-1',
    );
    expect(result).toEqual({ id: 'order-1' });
  });

  it('updateStatus uses authenticated business id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'biz-1' });
    orderServiceMock.updateStatusForBusiness.mockResolvedValue({
      id: 'order-1',
      status: 'delivered',
    });

    const result = await controller.updateStatus('token', 'order-1', {
      status: 'delivered',
    });

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.updateStatusForBusiness).toHaveBeenCalledWith(
      'biz-1',
      'order-1',
      'delivered',
    );
    expect(result).toEqual({
      id: 'order-1',
      status: 'delivered',
    });
  });
});
