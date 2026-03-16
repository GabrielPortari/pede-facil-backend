import {
  Controller,
  Get,
  INestApplication,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { applyEdgeHardening } from '../src/edge-hardening';

@Controller()
class ProbeController {
  @Get('security-probe')
  ping() {
    return { ok: true };
  }
}

@Module({
  controllers: [ProbeController],
})
class ProbeModule {}

describe('Edge hardening routine (e2e)', () => {
  async function createApp(options: {
    env: string;
    corsOrigins: string[];
    swaggerUsername?: string;
    swaggerPassword?: string;
  }) {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    applyEdgeHardening(app, options);
    await app.init();
    return app;
  }

  it('adds security headers via helmet', async () => {
    const app = await createApp({
      env: 'development',
      corsOrigins: ['http://allowed.local'],
    });

    const response = await request(app.getHttpServer())
      .get('/security-probe')
      .expect(200);

    expect(response.headers['x-dns-prefetch-control']).toBeDefined();
    await app.close();
  });

  it('allows configured origin in cors', async () => {
    const app = await createApp({
      env: 'development',
      corsOrigins: ['http://allowed.local'],
    });

    const response = await request(app.getHttpServer())
      .get('/security-probe')
      .set('Origin', 'http://allowed.local')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://allowed.local',
    );
    await app.close();
  });

  it('blocks disallowed origin in cors', async () => {
    const app = await createApp({
      env: 'development',
      corsOrigins: ['http://allowed.local'],
    });

    const response = await request(app.getHttpServer())
      .get('/security-probe')
      .set('Origin', 'http://evil.local')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    await app.close();
  });

  it('disables swagger in production', async () => {
    const app = await createApp({
      env: 'production',
      corsOrigins: ['http://allowed.local'],
    });

    await request(app.getHttpServer()).get('/api').expect(404);
    await app.close();
  });

  it('protects swagger with basic auth in staging', async () => {
    const app = await createApp({
      env: 'staging',
      corsOrigins: ['http://allowed.local'],
      swaggerUsername: 'admin',
      swaggerPassword: 'secret',
    });

    await request(app.getHttpServer()).get('/api').expect(401);

    const auth = Buffer.from('admin:secret').toString('base64');
    await request(app.getHttpServer())
      .get('/api')
      .set('Authorization', `Basic ${auth}`)
      .expect(200);

    await app.close();
  });
});
