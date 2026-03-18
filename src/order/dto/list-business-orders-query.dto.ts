import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ORDER_STATUSES, OrderStatus } from '../order-status.constants';

export type OrderStatusFilter = OrderStatus;

export class ListBusinessOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Filter orders by status',
    enum: ORDER_STATUSES,
  })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatusFilter;

  @ApiPropertyOptional({
    description: 'Maximum number of returned orders',
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
