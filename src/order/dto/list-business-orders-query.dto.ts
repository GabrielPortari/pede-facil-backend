import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const ORDER_STATUSES = [
  'payment_pending',
  'paid_awaiting_delivery',
  'delivered',
  'customer_confirmed',
  'customer_cancelled',
  'business_cancelled',
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

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
