import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateBusinessComplianceDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Ativa/desativa o business (apenas admin)',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Marca business como verificado (apenas admin)',
  })
  @IsOptional()
  @IsBoolean()
  verified?: boolean;
}
