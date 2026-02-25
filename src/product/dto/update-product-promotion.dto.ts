import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class MoneyDto {
  @ApiProperty({ example: 500, description: 'Amount in cents' })
  @IsInt()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 'BRL' })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateProductPromotionDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  active: boolean;

  @ApiPropertyOptional({ enum: ['percentage', 'fixed'] })
  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  type?: 'percentage' | 'fixed';

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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  usePromotionStock?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  promotionStock?: number;
}
