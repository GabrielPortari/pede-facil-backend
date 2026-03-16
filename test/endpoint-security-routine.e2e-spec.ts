import {
  ForbiddenException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request, { Test as SupertestRequest } from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { FirebaseService } from '../src/firebase/firebase.service';
import { BusinessController } from '../src/business/business.controller';
import { BusinessService } from '../src/business/business.service';
import { ProductController } from '../src/product/product.controller';
import { ProductService } from '../src/product/product.service';
import { BusinessOwnerGuard } from '../src/product/guards/business-owner.guard';
import { OrderController } from '../src/order/order.controller';
import { OrderService } from '../src/order/order.service';
import { UserController } from '../src/user/user.controller';
import { UserService } from '../src/user/user.service';
import { UserOwnerGuard } from '../src/user/guards/user-owner.guard';
import { RolesController } from '../src/roles/roles.controller';
import { BusinessOwnerOrAdminGuard } from '../src/business/guards/business-owner-or-admin.guard';
import { AuthRateLimitGuard } from '../src/auth/auth-rate-limit.guard';

type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

type ProtectedEndpointCase = {
  title: string;
  method: HttpMethod;
  path: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
};

const protectedEndpoints: ProtectedEndpointCase[] = [
  { title: 'POST /auth/logout', method: 'post', path: '/auth/logout' },
  { title: 'GET /auth/me', method: 'get', path: '/auth/me' },

  { title: 'GET /business/me', method: 'get', path: '/business/me' },
  {
    title: 'PATCH /business/me',
    method: 'patch',
    path: '/business/me',
    body: {},
  },
  {
    title: 'PATCH /business/:id',
    method: 'patch',
    path: '/business/biz-1',
    body: {},
  },
  {
    title: 'PATCH /business/:id/compliance',
    method: 'patch',
    path: '/business/biz-1/compliance',
    body: {},
  },
  {
    title: 'DELETE /business/:id',
    method: 'delete',
    path: '/business/biz-1',
  },

  { title: 'GET /user/:id', method: 'get', path: '/user/user-1' },
  { title: 'GET /user/me', method: 'get', path: '/user/me' },
  { title: 'PATCH /user/:id', method: 'patch', path: '/user/user-1', body: {} },
  { title: 'DELETE /user/:id', method: 'delete', path: '/user/user-1' },
  { title: 'GET /user/me/orders', method: 'get', path: '/user/me/orders' },

  {
    title: 'POST /business/:businessId/products',
    method: 'post',
    path: '/business/biz-1/products',
    body: {},
  },
  {
    title: 'PATCH /business/:businessId/products/:productId',
    method: 'patch',
    path: '/business/biz-1/products/prod-1',
    body: {},
  },
  {
    title: 'PATCH /business/:businessId/products/:productId/promotion',
    method: 'patch',
    path: '/business/biz-1/products/prod-1/promotion',
    body: {},
  },
  {
    title: 'DELETE /business/:businessId/products/:productId',
    method: 'delete',
    path: '/business/biz-1/products/prod-1',
  },

  { title: 'POST /order', method: 'post', path: '/order', body: {} },

  { title: 'GET /roles/user', method: 'get', path: '/roles/user' },
  { title: 'GET /roles/business', method: 'get', path: '/roles/business' },
];

function applyRequest(
  app: INestApplication<App>,
  endpoint: ProtectedEndpointCase,
): SupertestRequest {
  let req = request(app.getHttpServer())[endpoint.method](endpoint.path);

  if (endpoint.headers) {
    for (const [header, value] of Object.entries(endpoint.headers)) {
      req = req.set(header, value);
    }
  }

  if (endpoint.body) {
    req = req.send(endpoint.body);
  }

  return req;
}

describe('Endpoint security routine (e2e)', () => {
  let app: INestApplication<App>;

  const authServiceMock = {
    login: jest.fn(),
    signupUser: jest.fn(),
    signupBusiness: jest.fn(),
    refreshAuthToken: jest.fn(),
    recoverPassword: jest.fn(),
    logout: jest.fn(),
  };

  const firebaseServiceMock = {
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === 'business-owner-token') {
        return { uid: 'biz-1', role: 'business' };
      }
      if (token === 'business-other-token') {
        return { uid: 'biz-2', role: 'business' };
      }
      if (token === 'admin-token') {
        return { uid: 'admin-1', role: 'admin' };
      }
      if (token === 'user-token') {
        return { uid: 'user-1', role: 'user' };
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
        UserController,
        RolesController,
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: FirebaseService, useValue: firebaseServiceMock },
        { provide: BusinessService, useValue: businessServiceMock },
        { provide: ProductService, useValue: productServiceMock },
        { provide: OrderService, useValue: orderServiceMock },
        { provide: UserService, useValue: userServiceMock },
        BusinessOwnerGuard,
        UserOwnerGuard,
        BusinessOwnerOrAdminGuard,
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

  it.each(protectedEndpoints)(
    'must deny unauthenticated: $title',
    async (tc) => {
      await applyRequest(app, tc).expect(403);
    },
  );

  it('must deny malformed bearer token globally', async () => {
    await request(app.getHttpServer())
      .get('/roles/user')
      .set('Authorization', 'Invalid header-value')
      .expect(403);
  });

  it('must deny role mismatch for sensitive ownership endpoint', async () => {
    await request(app.getHttpServer())
      .patch('/business/biz-1')
      .set('Authorization', 'Bearer user-token')
      .send({})
      .expect(403);
  });

  it('must deny business role on admin compliance endpoint', async () => {
    await request(app.getHttpServer())
      .patch('/business/biz-1/compliance')
      .set('Authorization', 'Bearer business-owner-token')
      .send({ active: true, verified: true })
      .expect(403);
  });

  it('must deny business without relationship on GET /user/:id', async () => {
    await request(app.getHttpServer())
      .get('/user/user-1')
      .set('Authorization', 'Bearer business-other-token')
      .expect(403);
  });

  it('must return sanitized payload for related business on GET /user/:id', async () => {
    const response = await request(app.getHttpServer())
      .get('/user/user-1')
      .set('Authorization', 'Bearer business-owner-token')
      .expect(200);

    expect(response.body.id).toBe('user-1');
    expect(response.body.name).toBe('Joao');
    expect(response.body).not.toHaveProperty('email');
    expect(response.body).not.toHaveProperty('document');
    expect(response.body).not.toHaveProperty('address');
    expect(response.body).not.toHaveProperty('contact');
  });
});
