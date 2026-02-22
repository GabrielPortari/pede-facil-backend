import { IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateBusinessDto {
  @IsUUID()
  userId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  openingHours?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
