import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsNotEmpty,
  IsPhoneNumber,
  Matches,
  isBoolean,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @ApiProperty({ example: 'Rua das Flores' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '123' })
  @IsString()
  @IsNotEmpty()
  number: string;

  @ApiPropertyOptional({ example: 'Apto 12' })
  @IsOptional()
  @IsString()
  complement?: string;

  @ApiPropertyOptional({ example: 'Bela Vista' })
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ example: '01234-567' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'zipcode deve ser um CEP válido' })
  zipcode?: string;
}

export class CreateBusinessDto {
  @ApiProperty({ example: 'Cafeteria do Bairro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @IsPhoneNumber('BR')
  contact: string;

  @ApiProperty({ example: 'contato@cafebairro.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  active: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  verified: boolean;
}
