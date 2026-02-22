import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RolesGuard } from './roles.guard';

@Controller('roles')
export class RolesController {
  @Get('user')
  @ApiOperation({ summary: 'Endpoint para colaboradores' })
  @ApiResponse({ status: 200, description: 'Acesso de colaborador' })
  @UseGuards(RolesGuard('user'))
  @ApiBearerAuth()
  user() {
    return 'If you can see this, you are a user';
  }

  @Get('business')
  @ApiOperation({ summary: 'Endpoint para negocios' })
  @ApiResponse({ status: 200, description: 'Acesso de business' })
  @UseGuards(RolesGuard('business'))
  @ApiBearerAuth()
  business() {
    return 'If you can see this, you are a business';
  }
}
