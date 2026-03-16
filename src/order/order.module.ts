import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { BusinessOrderController } from './business-order.controller';

@Module({
  controllers: [OrderController, BusinessOrderController],
  providers: [OrderService],
})
export class OrderModule {}
