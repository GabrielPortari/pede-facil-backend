import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';

class CreateOrderItemDto {
  @ApiProperty({ description: 'Product id', example: 'abc123' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Quantity of product', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Options or notes for the item',
    type: Object,
    example: { size: 'Grande', observations: 'sem gelo' },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderItemOptionsDto)
  options?: CreateOrderItemOptionsDto;
}

class CreateOrderItemOptionsDto {
  @ApiPropertyOptional({ example: 'Grande' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'sem gelo' })
  @IsOptional()
  @IsString()
  observations?: string;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Business id where the order will be placed',
    example: 'business_abc',
  })
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'List of items' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    description: 'Payment method',
    example: 'card',
    enum: ['card', 'pix', 'cash'],
  })
  @IsString()
  @IsIn(['card', 'pix', 'cash'])
  paymentMethod: 'card' | 'pix' | 'cash';

  @ApiPropertyOptional({
    description: 'Pickup time ISO string (optional)',
    example: '2026-02-25T15:30:00Z',
  })
  @IsOptional()
  @IsString()
  pickupTime?: string;

  @ApiPropertyOptional({
    description: 'Address id (if delivery or for record)',
    example: 'addr_123',
  })
  @IsOptional()
  @IsString()
  addressId?: string;

  @ApiPropertyOptional({
    description: 'Client notes for the order',
    example: 'Retirar no balcão',
  })
  @IsOptional()
  @IsString()
  clientNotes?: string;

  @ApiPropertyOptional({
    description: 'Client-provided id for idempotency',
    example: 'client-order-0001',
  })
  @IsOptional()
  @IsString()
  clientOrderId?: string;
}
