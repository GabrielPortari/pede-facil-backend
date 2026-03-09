import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { LoginDto } from './dto/login.dto';
import { IdToken } from './dto/id-token.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';
import { SignupUserDto } from './dto/signup-user.dto';
import { SignupBusinessDto } from './dto/signup-business.dto';
import { RecoverPasswordDto } from './dto/recover-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @ApiOperation({ summary: 'Realiza login de um usuário' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso.' })
  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('signup/user')
  @ApiOperation({ summary: 'Registra um novo usuário' })
  @ApiBody({ type: SignupUserDto })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.' })
  @HttpCode(201)
  async signupUser(@Body() signupDto: SignupUserDto) {
    return this.authService.signupUser(signupDto as any);
  }

  @Post('signup/business')
  @ApiOperation({ summary: 'Registra um novo negócio' })
  @ApiBody({
    type: SignupBusinessDto,
    examples: {
      businessSignup: {
        summary: 'Payload oficial de cadastro de empresa',
        value: {
          name: 'Café do Centro',
          legalName: 'Café do Centro LTDA',
          cnpj: '12345678000195',
          website: 'https://cafedocentro.com.br',
          logoUrl: 'https://cdn.exemplo.com/logo.png',
          contact: '+5511999999999',
          email: 'contato@cafedocentro.com.br',
          password: 'senhaForte123',
          address: {
            address: 'Rua das Flores',
            number: '123',
            complement: 'Sala 5',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP',
            zipcode: '01001-000',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Negócio criado com sucesso.',
    schema: {
      example: {
        user: {
          uid: 'business-uid',
          email: 'contato@cafedocentro.com.br',
          name: 'Café do Centro',
          role: 'BUSINESS',
        },
        idToken: '<jwt>',
        refreshToken: '<refresh-token>',
        expiresIn: '3600',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Payload inválido.' })
  @ApiResponse({
    status: 409,
    description:
      'Conflito de unicidade (CNPJ já cadastrado ou Email já cadastrado).',
    schema: {
      example: {
        statusCode: 409,
        message: 'CNPJ já cadastrado',
        error: 'Conflict',
      },
    },
  })
  @HttpCode(201)
  async signupBusiness(@Body() signupDto: SignupBusinessDto) {
    return this.authService.signupBusiness(signupDto as any);
  }

  @Post('refresh-auth')
  @ApiOperation({ summary: 'Renova token de autenticação' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  @HttpCode(200)
  async refreshAuthToken(@Body() refreshToken: RefreshTokenDto) {
    return this.authService.refreshAuthToken(refreshToken.refreshToken);
  }

  @Post('recover-password')
  @ApiOperation({ summary: 'Envia e-mail de recuperação de senha' })
  @ApiBody({ type: RecoverPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'E-mail de recuperação enviado com sucesso.',
  })
  @HttpCode(200)
  async recoverPassword(@Body() recoverPasswordDto: RecoverPasswordDto) {
    return this.authService.recoverPassword(recoverPasswordDto.email);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Finaliza sessão do usuário (logout)' })
  @ApiResponse({ status: 204, description: 'Logout realizado com sucesso.' })
  @HttpCode(204)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async logout(@IdToken() idToken: string) {
    return this.authService.logout(idToken);
  }

  @Get('me')
  @ApiOperation({ summary: 'Retorna dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário retornados.' })
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  async profile(@IdToken() token: string) {
    return await this.firebaseService.verifyIdToken(token);
  }
}
