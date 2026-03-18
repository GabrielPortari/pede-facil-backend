import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { BUSINESS_ORDER_STATUS_UPDATES } from '../order-status.constants';
import type { BusinessOrderStatusUpdate } from '../order-status.constants';

export class UpdateBusinessOrderStatusDto {
  @ApiProperty({
    description: 'Business-allowed order status transition target',
    enum: BUSINESS_ORDER_STATUS_UPDATES,
  })
  @IsString()
  @IsIn(BUSINESS_ORDER_STATUS_UPDATES)
  status: BusinessOrderStatusUpdate;
}
