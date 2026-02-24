import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { BusinessOwnerGuard } from './guards/business-owner.guard';

@Module({
  controllers: [ProductController],
  providers: [ProductService, BusinessOwnerGuard],
})
export class ProductModule {}
