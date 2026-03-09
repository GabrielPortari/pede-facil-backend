import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessService } from './business.service';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Role } from 'src/constants/roles';
import { RolesGuard } from 'src/roles/roles.guard';
import { IdToken } from 'src/auth/dto/id-token.decorator';
import { FirebaseService } from 'src/firebase/firebase.service';

@Controller('business')
export class BusinessController {
  constructor(
    private readonly businessService: BusinessService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get('me')
  @UseGuards(RolesGuard(Role.BUSINESS))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém os dados do negócio autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do negócio autenticado.' })
  async findMe(@IdToken() token: string) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.businessService.findOne(uid);
  }

  @Patch('me')
  @UseGuards(RolesGuard(Role.BUSINESS))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza os dados do negócio autenticado' })
  @ApiResponse({ status: 200, description: 'Negócio atualizado com sucesso.' })
  async updateMe(
    @IdToken() token: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.businessService.update(uid, updateBusinessDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista todos os negócios' })
  @ApiResponse({ status: 200, description: 'Lista de negócios retornada.' })
  findAll() {
    return this.businessService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtém os dados de um negócio pelo ID' })
  @ApiResponse({ status: 200, description: 'Dados do negócio retornados.' })
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard(Role.BUSINESS))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza um negócio pelo ID' })
  @ApiResponse({ status: 200, description: 'Negócio atualizado com sucesso.' })
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, updateBusinessDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard(Role.ADMIN))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove um negócio pelo ID' })
  @ApiResponse({ status: 200, description: 'Negócio removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
