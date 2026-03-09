import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsNotEmpty,
  IsPhoneNumber,
  Matches,
  MinLength,
  IsUrl,
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

  @ApiProperty({ example: 'Bela Vista' })
  @IsString()
  @IsNotEmpty()
  neighborhood: string;

  @ApiProperty({ example: 'São Paulo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'SP' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Za-z]{2}$/, { message: 'state deve conter 2 letras' })
  state: string;

  @ApiProperty({ example: '01234-567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'zipcode deve ser um CEP válido' })
  zipcode: string;
}

export class SignupBusinessDto {
  @ApiProperty({ example: 'Cafeteria do Bairro' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Cafeteria do Bairro LTDA' })
  @IsString()
  @IsNotEmpty()
  legalName: string;

  @ApiProperty({ example: '12345678000195' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{14}$/, { message: 'cnpj deve conter 14 dígitos numéricos' })
  cnpj: string;

  @ApiPropertyOptional({ example: 'https://cafeteriadobairro.com.br' })
  @IsOptional()
  @IsUrl({}, { message: 'website deve ser uma URL válida' })
  website?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  @IsNotEmpty()
  address: AddressDto;

  @ApiProperty({ example: '+5511999999999' })
  @IsString()
  @IsPhoneNumber('BR')
  contact: string;

  @ApiProperty({ example: 'contato@cafebairro.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password: string;
}
