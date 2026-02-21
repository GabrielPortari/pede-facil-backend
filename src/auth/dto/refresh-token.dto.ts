import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'A valid refresh token' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
