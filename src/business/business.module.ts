import { Module } from '@nestjs/common';
import { BusinessService } from './business.service';
import { BusinessController } from './business.controller';
import { BusinessOwnerOrAdminGuard } from './guards/business-owner-or-admin.guard';

@Module({
  controllers: [BusinessController],
  providers: [BusinessService, BusinessOwnerOrAdminGuard],
})
export class BusinessModule {}
