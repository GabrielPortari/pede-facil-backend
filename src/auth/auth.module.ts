import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, AuthRateLimitGuard],
})
export class AuthModule {}
