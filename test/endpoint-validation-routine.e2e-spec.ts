import {
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { FirebaseService } from '../src/firebase/firebase.service';
import { BusinessController } from '../src/business/business.controller';
import { BusinessService } from '../src/business/business.service';
import { ProductController } from '../src/product/product.controller';
import { ProductService } from '../src/product/product.service';
import { BusinessOwnerGuard } from '../src/product/guards/business-owner.guard';
import { BusinessOwnerOrAdminGuard } from '../src/business/guards/business-owner-or-admin.guard';
import { OrderController } from '../src/order/order.controller';
import { BusinessOrderController } from '../src/order/business-order.controller';
import { OrderService } from '../src/order/order.service';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { UserOwnerGuard } from '../src/user/guards/user-owner.guard';
import { AuthRateLimitGuard } from '../src/auth/auth-rate-limit.guard';

type HttpMethod = 'post' | 'patch';

type ValidationCase = {
  title: string;
  method: HttpMethod;
  path: string;
  authToken?: string;
  validBody: Record<string, unknown>;
};

const validationCases: ValidationCase[] = [
  {
    title: 'POST /auth/login',
    method: 'post',
    path: '/auth/login',
    validBody: { email: 'user@example.com', password: 'secret123' },
  },
  {
    title: 'POST /auth/signup/user',
    method: 'post',
    path: '/auth/signup/user',
    validBody: {
      name: 'Joao',
      email: 'joao@example.com',
      password: 'secret123',
    },
  },
  {
    title: 'POST /auth/signup/business',
    method: 'post',
    path: '/auth/signup/business',
    validBody: {
      name: 'Cafe A',
      legalName: 'Cafe A LTDA',
      cnpj: '12345678000195',
      contact: '+5511999999999',
      email: 'contato@cafe.com',
      password: 'secret123',
      address: {
        address: 'Rua A',
        number: '10',
        neighborhood: 'Centro',
        city: 'Sao Paulo',
        state: 'SP',
        zipcode: '01001-000',
      },
    },
  },
  {
    title: 'POST /auth/refresh-auth',
    method: 'post',
    path: '/auth/refresh-auth',
    validBody: { refreshToken: 'refresh-token' },
  },
  {
    title: 'POST /auth/recover-password',
    method: 'post',
    path: '/auth/recover-password',
    validBody: { email: 'user@example.com' },
  },
  {
    title: 'PATCH /business/me',
    method: 'patch',
    path: '/business/me',
    authToken: 'business-owner-token',
    validBody: { name: 'Novo nome' },
  },
  {
    title: 'PATCH /business/:id',
    method: 'patch',
    path: '/business/biz-1',
    authToken: 'business-owner-token',
    validBody: { name: 'Novo nome' },
  },
  {
    title: 'PATCH /business/:id/compliance',
    method: 'patch',
    path: '/business/biz-1/compliance',
    authToken: 'admin-token',
    validBody: { active: true, verified: true },
  },
  {
    title: 'PATCH /user/:id',
    method: 'patch',
    path: '/user/user-1',
    authToken: 'user-token',
    validBody: { name: 'Novo nome' },
  },
  {
    title: 'POST /business/:businessId/products',
    method: 'post',
    path: '/business/biz-1/products',
    authToken: 'business-owner-token',
    validBody: {
      name: 'Cappuccino',
      price: { amount: 1299, currency: 'BRL' },
    },
  },
  {
    title: 'PATCH /business/:businessId/products/:productId',
    method: 'patch',
    path: '/business/biz-1/products/prod-1',
    authToken: 'business-owner-token',
    validBody: { name: 'Cappuccino grande' },
  },
  {
    title: 'PATCH /business/:businessId/products/:productId/promotion',
    method: 'patch',
    path: '/business/biz-1/products/prod-1/promotion',
    authToken: 'business-owner-token',
    validBody: { active: true, type: 'percentage', percentage: 10 },
  },
  {
    title: 'POST /order',
    method: 'post',
    path: '/order',
    authToken: 'user-token',
    validBody: {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
    },
  },
];

describe('Endpoint validation routine (e2e)', () => {
  let app: INestApplication<App>;

  const authServiceMock = {
    login: jest.fn().mockResolvedValue({ idToken: 'id', refreshToken: 'rf' }),
    signupUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
    signupBusiness: jest.fn().mockResolvedValue({ id: 'biz-1' }),
    refreshAuthToken: jest.fn().mockResolvedValue({ idToken: 'id2' }),
    recoverPassword: jest.fn().mockResolvedValue({ ok: true }),
    logout: jest.fn().mockResolvedValue(undefined),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === 'business-owner-token') {
        return { uid: 'biz-1', role: 'business' };
      }
      if (token === 'user-token') {
        return { uid: 'user-1', role: 'user' };
      }
      if (token === 'admin-token') {
        return { uid: 'admin-1', role: 'admin' };
      }
      throw new Error('invalid token');
    }),
  };

  const businessServiceMock = {
    findOne: jest.fn().mockResolvedValue({ id: 'biz-1' }),
    update: jest.fn().mockResolvedValue({ id: 'biz-1' }),
    updateCompliance: jest.fn().mockResolvedValue({ id: 'biz-1' }),
    findAll: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue({ id: 'biz-1' }),
  };

  const productServiceMock = {
    create: jest.fn().mockResolvedValue({ id: 'prod-1' }),
    update: jest.fn().mockResolvedValue({ id: 'prod-1' }),
    updatePromotion: jest.fn().mockResolvedValue({ id: 'prod-1' }),
    remove: jest.fn().mockResolvedValue({ id: 'prod-1' }),
    findByBusiness: jest.fn().mockResolvedValue([]),
    findAvailableByBusiness: jest.fn().mockResolvedValue([]),
    findUnavailableByBusiness: jest.fn().mockResolvedValue([]),
    findProductsInPromotion: jest.fn().mockResolvedValue([]),
    findProductsWithoutPromotion: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'prod-1' }),
  };

  const orderServiceMock = {
    create: jest.fn().mockResolvedValue({ id: 'order-1' }),
    listForBusiness: jest
      .fn()
      .mockResolvedValue([{ id: 'order-1', businessId: 'biz-1' }]),
    findOneForBusiness: jest
      .fn()
      .mockResolvedValue({ id: 'order-1', businessId: 'biz-1' }),
  };

  const userServiceMock = {
    findOneForBusiness: jest.fn(async (userId: string, businessId: string) => {
      if (userId === 'user-1' && businessId === 'biz-1') {
        return {
          id: 'user-1',
          name: 'Joao',
          createdAt: '2026-03-10T15:00:00.000Z',
          updatedAt: '2026-03-11T16:00:00.000Z',
        };
      }
      throw new ForbiddenException(
        'Business has no relationship with this user',
      );
    }),
    findOne: jest.fn().mockResolvedValue({ id: 'user-1' }),
    update: jest.fn().mockResolvedValue({ id: 'user-1' }),
    remove: jest.fn().mockResolvedValue({ id: 'user-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        BusinessController,
        ProductController,
        OrderController,
        BusinessOrderController,
        UserController,
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
        { provide: BusinessService, useValue: businessServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: UserService, useValue: userServiceMock },
        BusinessOwnerGuard,
        BusinessOwnerOrAdminGuard,
        UserOwnerGuard,
        AuthRateLimitGuard,
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

  it.each(validationCases)(
    'must reject non-whitelisted field: $title',
    async (tc) => {
      let req = request(app.getHttpServer())[tc.method](tc.path);

      if (tc.authToken) {
        req = req.set('Authorization', `Bearer ${tc.authToken}`);
      }

      await req
        .send({
          ...tc.validBody,
          injectedAttackField: 'must_be_blocked',
        })
        .expect(400);
    },
  );

  it('must block privilege escalation payload on PATCH /business/me', async () => {
    await request(app.getHttpServer())
      .patch('/business/me')
      .set('Authorization', 'Bearer business-owner-token')
      .send({ name: 'Novo nome', active: true, verified: true })
      .expect(400);
  });

  it('must block privilege escalation payload on PATCH /business/:id', async () => {
    await request(app.getHttpServer())
      .patch('/business/biz-1')
      .set('Authorization', 'Bearer business-owner-token')
      .send({ legalName: 'Empresa X', active: true, verified: true })
      .expect(400);
  });

  it('must not expose PII fields in business user view', async () => {
    const response = await request(app.getHttpServer())
      .get('/user/user-1')
      .set('Authorization', 'Bearer business-owner-token')
      .expect(200);

    expect(response.body).not.toHaveProperty('email');
    expect(response.body).not.toHaveProperty('document');
    expect(response.body).not.toHaveProperty('address');
    expect(response.body).not.toHaveProperty('contact');
  });

  it('must reject order creation with empty items array', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .set('Authorization', 'Bearer user-token')
      .send({
        businessId: 'biz-1',
        items: [],
        paymentMethod: 'pix',
      })
      .expect(400);
  });

  it('must accept observations on POST /order', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .set('Authorization', 'Bearer user-token')
      .send({
        businessId: 'biz-1',
        items: [{ productId: 'prod-1', quantity: 1 }],
        paymentMethod: 'pix',
        observations: 'Sem gelo em todos os itens',
      })
      .expect(201);

    expect(orderServiceMock.create).toHaveBeenCalledWith('user-1', {
      businessId: 'biz-1',
      items: [{ productId: 'prod-1', quantity: 1 }],
      paymentMethod: 'pix',
      observations: 'Sem gelo em todos os itens',
    });
  });

  it('must reject legacy items[].options payload on POST /order', async () => {
    await request(app.getHttpServer())
      .post('/order')
      .set('Authorization', 'Bearer user-token')
      .send({
        businessId: 'biz-1',
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
            options: { size: 'G' },
          },
        ],
        paymentMethod: 'pix',
      })
      .expect(400);
  });

  it('must reject invalid status query on GET /business/me/orders', async () => {
    await request(app.getHttpServer())
      .get('/business/me/orders?status=hacked_status')
      .set('Authorization', 'Bearer business-owner-token')
      .expect(400);
  });

  it('must reject limit out of range on GET /business/me/orders', async () => {
    await request(app.getHttpServer())
      .get('/business/me/orders?limit=500')
      .set('Authorization', 'Bearer business-owner-token')
      .expect(400);
  });

  it('must reject non-whitelisted query fields on GET /business/me/orders', async () => {
    await request(app.getHttpServer())
      .get('/business/me/orders?unexpectedFilter=true')
      .set('Authorization', 'Bearer business-owner-token')
      .expect(400);
  });
});
