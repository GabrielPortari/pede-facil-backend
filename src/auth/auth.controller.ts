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
import { SignupDto } from './dto/signup.dto';
import { IdToken } from './dto/id-token.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';

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

  @Post('signup')
  @ApiOperation({ summary: 'Registra um novo usuário' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso.' })
  @HttpCode(201)
  async signup(@Body() signupDto: SignupDto) {
    const { user, accessToken, refreshToken } = await this.authService.signup(
      signupDto as any,
    );
    return { user, accessToken, refreshToken };
  }

  @Post('refresh-auth')
  @ApiOperation({ summary: 'Renova token de autenticação' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso.' })
  @HttpCode(200)
  async refreshAuthToken(@Body() refreshToken: RefreshTokenDto) {
    return this.authService.refreshAuthToken(refreshToken.refreshToken);
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
