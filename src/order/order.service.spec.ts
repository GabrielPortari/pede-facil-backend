import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import * as admin from 'firebase-admin';
import { ProductEntity } from 'src/product/entities/product.entity';
import { UserEntity } from 'src/user/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let firestoreMock: any;
  let ordersStorage: Map<string, any>;
  let txUpdateMock: jest.Mock;
  let whereMock: jest.Mock;
  let orderByMock: jest.Mock;
  let limitMock: jest.Mock;
  let getQueryMock: jest.Mock;

  beforeEach(async () => {
    ordersStorage = new Map<string, any>();
    txUpdateMock = jest.fn((ref: any, updates: Record<string, any>) => {
      if (ref?.__kind !== 'orderRef') {
        return;
      }

      const existing = ordersStorage.get(ref.id) ?? {};
      ordersStorage.set(ref.id, { ...existing, ...updates });
    });

    const defaultProductRef = { __kind: 'productRef', id: 'prod-1' };
    const buildOrderRef = (id?: string) => ({
      __kind: 'orderRef',
      id: id ?? 'order-random-id',
      get: jest.fn(async () => {
        const data = ordersStorage.get(id ?? 'order-random-id');
        return {
          id: id ?? 'order-random-id',
          exists: !!data,
          data: () => data,
        };
      }),
    });

    getQueryMock = jest.fn(async () => ({
      docs: Array.from(ordersStorage.entries()).map(([id, data]) => ({
        id,
        data: () => data,
      })),
    }));
    limitMock = jest.fn(() => ({ get: getQueryMock }));
    orderByMock = jest.fn(() => ({ limit: limitMock, where: whereMock }));
    whereMock = jest.fn((field: string, _op: string, value: string) => {
      if (field === 'businessId') {
        getQueryMock.mockImplementation(async () => ({
          docs: Array.from(ordersStorage.entries())
            .filter(([, data]) => data.businessId === value)
            .map(([id, data]) => ({ id, data: () => data })),
        }));
      }

      if (field === 'status') {
        getQueryMock.mockImplementation(async () => ({
          docs: Array.from(ordersStorage.entries())
            .filter(([, data]) => data.status === value)
            .map(([id, data]) => ({ id, data: () => data })),
        }));
      }

      return {
        orderBy: orderByMock,
        where: whereMock,
        limit: limitMock,
      };
    });

    const defaultOrderCollection = {
      doc: buildOrderRef,
      where: whereMock,
      orderBy: orderByMock,
      limit: limitMock,
    };

    const txMock = {
      get: jest.fn(async (ref: any) => {
        if (ref?.__kind === 'orderRef') {
          const data = ordersStorage.get(ref.id);
          return {
            id: ref.id,
            exists: !!data,
            data: () => data,
          };
        }

        if (ref?.__kind === 'productRef') {
          return {
            exists: true,
            id: ref.id,
            data: () => ({}),
          };
        }

        throw new Error('Unexpected ref type in tx.get');
      }),
      update: txUpdateMock,
      set: jest.fn((ref: any, data: any) => {
        ordersStorage.set(ref.id, data);
      }),
    };

    firestoreMock = {
      collection: jest.fn((collectionName: string) => {
        if (collectionName === 'orders') {
          return defaultOrderCollection;
        }

        throw new Error(`Unexpected collection: ${collectionName}`);
      }),
      runTransaction: jest.fn(async (handler: any) => handler(txMock)),
    };

    jest.spyOn(admin, 'firestore').mockReturnValue(firestoreMock as any);
    (admin.firestore as any).FieldValue = {
      serverTimestamp: jest.fn(() => '__ts__'),
    };
    jest
      .spyOn(ProductEntity, 'docRef')
      .mockReturnValue(defaultProductRef as any);
    jest.spyOn(UserEntity, 'docRef').mockReturnValue({
      get: jest.fn(async () => ({
        exists: true,
        data: () => ({ name: 'João Silva' }),
      })),
    } as any);
    jest.spyOn(ProductEntity, 'fromFirestore').mockReturnValue({
      name: 'Cappuccino',
      available: true,
      useStock: true,
      stock: 10,
      usePromotionStock: false,
      promotion: { active: false },
      price: { amount: 1000, currency: 'BRL' },
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderService],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('blocks purchase when product is unavailable even without stock control', async () => {
    jest.spyOn(ProductEntity, 'fromFirestore').mockReturnValue({
      name: 'Cappuccino',
      available: false,
      useStock: false,
      stock: 10,
      usePromotionStock: false,
      promotion: { active: false },
      price: { amount: 1000, currency: 'BRL' },
    } as any);

    await expect(
      service.create('user-1', {
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        paymentMethod: 'pix',
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the same order for repeated clientOrderId and does not duplicate stock updates', async () => {
    const payload = {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
      clientOrderId: 'client-order-1',
    } as any;

    const first = await service.create('user-1', payload);
    const second = await service.create('user-1', payload);

    expect(first.id).toBeDefined();
    expect(second.id).toBe(first.id);
    expect(txUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('persists order observations when provided', async () => {
    const created = await service.create('user-1', {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
      observations: 'Sem gelo em todos os itens',
    } as any);

    expect(created.observations).toBe('Sem gelo em todos os itens');
  });

  it('embeds userName from user record in order', async () => {
    const created = await service.create('user-1', {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
    } as any);

    expect(created.userName).toBe('João Silva');
  });

  it('defaults userName to Unknown when user not found', async () => {
    jest.spyOn(UserEntity, 'docRef').mockReturnValue({
      get: jest.fn(async () => ({ exists: false, data: () => null })),
    } as any);

    const created = await service.create('user-ghost', {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
    } as any);

    expect(created.userName).toBe('Unknown');
  });

  it('lists only orders from the requested business', async () => {
    ordersStorage.set('order-1', {
      businessId: 'biz-1',
      status: 'payment_pending',
    });
    ordersStorage.set('order-2', {
      businessId: 'biz-2',
      status: 'payment_pending',
    });

    const result = await service.listForBusiness('biz-1', { limit: 50 } as any);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('order-1');
    expect(result[0].businessId).toBe('biz-1');
  });

  it('returns order details for same business', async () => {
    ordersStorage.set('order-1', {
      businessId: 'biz-1',
      status: 'payment_pending',
    });

    const result = await service.findOneForBusiness('order-1', 'biz-1');

    expect(result.id).toBe('order-1');
    expect(result.businessId).toBe('biz-1');
  });

  it('hides foreign orders by returning not found', async () => {
    ordersStorage.set('order-1', {
      businessId: 'biz-1',
      status: 'payment_pending',
    });

    await expect(
      service.findOneForBusiness('order-1', 'biz-2'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('simulates payment and moves from payment_pending to paid_awaiting_delivery', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'payment_pending',
    });

    const result = await service.simulatePayment('user-1', 'order-1');

    expect(result.status).toBe('paid_awaiting_delivery');
    expect(ordersStorage.get('order-1')?.status).toBe('paid_awaiting_delivery');
  });

  it('rejects invalid simulated payment transition', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'delivered',
    });

    await expect(
      service.simulatePayment('user-1', 'order-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows business to move paid_awaiting_delivery to delivered', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'paid_awaiting_delivery',
    });

    const result = await service.updateStatusForBusiness(
      'biz-1',
      'order-1',
      'delivered',
    );

    expect(result.status).toBe('delivered');
    expect(ordersStorage.get('order-1')?.status).toBe('delivered');
  });

  it('allows user to confirm after delivered', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'delivered',
    });

    const result = await service.updateStatusForUser(
      'user-1',
      'order-1',
      'customer_confirmed',
    );

    expect(result.status).toBe('customer_confirmed');
    expect(ordersStorage.get('order-1')?.status).toBe('customer_confirmed');
  });

  it('allows user to decline after delivered', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'delivered',
    });

    const result = await service.updateStatusForUser(
      'user-1',
      'order-1',
      'customer_declined',
    );

    expect(result.status).toBe('customer_declined');
    expect(ordersStorage.get('order-1')?.status).toBe('customer_declined');
  });

  it('allows user to request the product again after declined', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'customer_declined',
    });

    const result = await service.updateStatusForUser(
      'user-1',
      'order-1',
      'paid_awaiting_delivery',
    );

    expect(result.status).toBe('paid_awaiting_delivery');
    expect(ordersStorage.get('order-1')?.status).toBe('paid_awaiting_delivery');
  });

  it('allows user to cancel after declined', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'customer_declined',
    });

    const result = await service.updateStatusForUser(
      'user-1',
      'order-1',
      'customer_cancelled',
    );

    expect(result.status).toBe('customer_cancelled');
    expect(ordersStorage.get('order-1')?.status).toBe('customer_cancelled');
  });

  it('allows business to cancel after customer_declined', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'customer_declined',
    });

    const result = await service.updateStatusForBusiness(
      'biz-1',
      'order-1',
      'business_cancelled',
    );

    expect(result.status).toBe('business_cancelled');
    expect(ordersStorage.get('order-1')?.status).toBe('business_cancelled');
  });

  it('rejects user transition when order is not owned by user', async () => {
    ordersStorage.set('order-1', {
      userId: 'user-1',
      businessId: 'biz-1',
      status: 'delivered',
    });

    await expect(
      service.updateStatusForUser('user-2', 'order-1', 'customer_confirmed'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
