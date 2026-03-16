import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { NextFunction, Request, Response } from 'express';

export type RuntimeEnvironment =
  | 'development'
  | 'staging'
  | 'production'
  | string;

type EdgeHardeningOptions = {
  env: RuntimeEnvironment;
  corsOrigins: string[];
  swaggerUsername?: string;
  swaggerPassword?: string;
};

export function resolveEnvironment(
  value: string | undefined,
): RuntimeEnvironment {
  return (value || 'development').toLowerCase();
}

export function resolveCorsOrigins(value: string | undefined): string[] {
  const fallback = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:19006',
  ];
  const parsed = (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return parsed.length > 0 ? parsed : fallback;
}

export function shouldEnableSwagger(env: RuntimeEnvironment): boolean {
  return env === 'development' || env === 'staging';
}

export function shouldProtectSwagger(env: RuntimeEnvironment): boolean {
  return env === 'staging';
}

export function createSwaggerBasicAuthMiddleware(
  username: string,
  password: string,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const headerFromGetter =
      typeof req.get === 'function' ? req.get('authorization') : undefined;
    const headerFromHeaders =
      (req.headers as any)?.get?.('authorization') ??
      (req.headers as any)?.authorization;
    const header = String(headerFromGetter ?? headerFromHeaders ?? '');
    if (!header.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      return res.status(401).send('Authentication required');
    }

    const base64 = header.replace('Basic ', '').trim();
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    const parsedUser = separator >= 0 ? decoded.slice(0, separator) : '';
    const parsedPass = separator >= 0 ? decoded.slice(separator + 1) : '';

    if (parsedUser !== username || parsedPass !== password) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Swagger"');
      return res.status(401).send('Invalid credentials');
    }

    next();
  };
}

export function applyEdgeHardening(
  app: INestApplication,
  options: EdgeHardeningOptions,
) {
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (options.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
  });

  if (!shouldEnableSwagger(options.env)) {
    return;
  }

  if (shouldProtectSwagger(options.env)) {
    if (!options.swaggerUsername || !options.swaggerPassword) {
      return;
    }

    const middleware = createSwaggerBasicAuthMiddleware(
      options.swaggerUsername,
      options.swaggerPassword,
    );
    app.use(['/api', '/api-json'], middleware as any);
  }

  const config = new DocumentBuilder()
    .setTitle('Pede Fácil API')
    .setDescription('API documentation for Pede Fácil application')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
