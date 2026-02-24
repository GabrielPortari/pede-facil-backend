import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateProductAvailabilityDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  available: boolean;
}
