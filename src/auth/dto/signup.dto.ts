import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsIn, Length } from 'class-validator';

export class SignupDto {
  @ApiProperty({ description: 'Nome do usuário' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'E-mail do usuário', format: 'email' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Senha do usuário', format: 'password' })
  @IsNotEmpty()
  @Length(6, 128)
  password: string;

  @ApiProperty({
    description: 'Papel do usuário',
    enum: ['client', 'business'],
  })
  @IsNotEmpty()
  @IsIn(['client', 'business'])
  role: 'client' | 'business';
}
