import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class MoneyDto {
  @ApiProperty({ example: 1299, description: 'Amount in cents' })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

class PromotionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ enum: ['percentage', 'fixed'] })
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @ApiPropertyOptional({
    example: 10,
    description: 'Percentage value from 0 to 100',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({ type: MoneyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  amount?: MoneyDto;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Cappuccino' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Cafe com leite e canela' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: MoneyDto })
  @ValidateNested()
  @Type(() => MoneyDto)
  price: MoneyDto;

  @ApiPropertyOptional({ type: MoneyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => MoneyDto)
  discountPrice?: MoneyDto;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cappuccino.png' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  useStock?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  usePromotionStock?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  promotionStock?: number;

  @ApiPropertyOptional({ type: PromotionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PromotionDto)
  promotion?: PromotionDto;
}
