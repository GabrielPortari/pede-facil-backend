import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { FirebaseService } from 'src/firebase/firebase.service';

describe('OrderController', () => {
  let controller: OrderController;
  const orderServiceMock = {
    create: jest.fn(),
    simulatePayment: jest.fn(),
    updateStatusForUser: jest.fn(),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        { provide: OrderService, useValue: orderServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create uses authenticated user id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    orderServiceMock.create.mockResolvedValue({ id: 'order-1' });

    const dto = {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
    } as any;

    const result = await controller.create('token', dto);

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.create).toHaveBeenCalledWith('user-1', dto);
    expect(result).toEqual({ id: 'order-1' });
  });

  it('simulatePayment uses authenticated user id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    orderServiceMock.simulatePayment.mockResolvedValue({
      id: 'order-1',
      status: 'paid_awaiting_delivery',
    });

    const result = await controller.simulatePayment('token', 'order-1');

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.simulatePayment).toHaveBeenCalledWith(
      'user-1',
      'order-1',
    );
    expect(result.status).toBe('paid_awaiting_delivery');
  });

  it('updateStatus uses authenticated user id', async () => {
    firebaseServiceMock.verifyIdToken.mockResolvedValue({ uid: 'user-1' });
    orderServiceMock.updateStatusForUser.mockResolvedValue({
      id: 'order-1',
      status: 'customer_confirmed',
    });

    const result = await controller.updateStatus('token', 'order-1', {
      status: 'customer_confirmed',
    });

    expect(firebaseServiceMock.verifyIdToken).toHaveBeenCalledWith(
      'token',
      true,
    );
    expect(orderServiceMock.updateStatusForUser).toHaveBeenCalledWith(
      'user-1',
      'order-1',
      'customer_confirmed',
    );
    expect(result.status).toBe('customer_confirmed');
  });
});
