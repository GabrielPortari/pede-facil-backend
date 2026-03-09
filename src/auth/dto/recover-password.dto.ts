import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RecoverPasswordDto {
  @ApiProperty({
    description: 'E-mail da conta para recuperar senha',
    format: 'email',
    example: 'usuario@exemplo.com',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
