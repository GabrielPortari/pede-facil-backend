import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from './order.service';
import * as admin from 'firebase-admin';
import { ProductEntity } from 'src/product/entities/product.entity';
import { BadRequestException } from '@nestjs/common';

describe('OrderService', () => {
  let service: OrderService;
  let firestoreMock: any;
  let ordersStorage: Map<string, any>;
  let txUpdateMock: jest.Mock;

  beforeEach(async () => {
    ordersStorage = new Map<string, any>();
    txUpdateMock = jest.fn();

    const defaultProductRef = { __kind: 'productRef', id: 'prod-1' };
    const defaultOrderCollection = {
      doc: (id?: string) => ({
        __kind: 'orderRef',
        id: id ?? 'order-random-id',
      }),
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
});
