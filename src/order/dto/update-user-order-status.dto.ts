import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { USER_ORDER_STATUS_UPDATES } from '../order-status.constants';
import type { UserOrderStatusUpdate } from '../order-status.constants';

export class UpdateUserOrderStatusDto {
  @ApiProperty({
    description: 'User-allowed order status transition target',
    enum: USER_ORDER_STATUS_UPDATES,
  })
  @IsString()
  @IsIn(USER_ORDER_STATUS_UPDATES)
  status: UserOrderStatusUpdate;
}
