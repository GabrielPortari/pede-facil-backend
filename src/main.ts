import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import {
  applyEdgeHardening,
  resolveCorsOrigins,
  resolveEnvironment,
} from './edge-hardening';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureEdgeHardening(app);
  configureValidationPipe(app);
  await app.listen(process.env.PORT ?? 3000);
}

function configureEdgeHardening(app: INestApplication) {
  const env = resolveEnvironment(process.env.NODE_ENV);
  const corsOrigins = resolveCorsOrigins(process.env.CORS_ORIGINS);

  applyEdgeHardening(app, {
    env,
    corsOrigins,
    swaggerUsername: process.env.SWAGGER_USERNAME,
    swaggerPassword: process.env.SWAGGER_PASSWORD,
  });
}

function configureValidationPipe(app: INestApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

bootstrap();
