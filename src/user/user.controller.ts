import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from 'src/constants/roles';
import { RolesGuard } from 'src/roles/roles.guard';
import { UserOwnerGuard } from './guards/user-owner.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém os dados de um usuário' })
  @ApiResponse({ status: 200, description: 'Dados do usuário.' })
  @UseGuards(RolesGuard(Role.BUSINESS))
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém os dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário autenticado.' })
  @UseGuards(RolesGuard(Role.USER), UserOwnerGuard)
  findMe(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza os dados do usuário autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário atualizados com sucesso.',
  })
  @UseGuards(RolesGuard(Role.USER), UserOwnerGuard)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove o usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Usuário removido com sucesso.' })
  @UseGuards(RolesGuard(Role.USER), UserOwnerGuard)
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Get('me/orders')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém os pedidos do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Pedidos do usuário autenticado.' })
  @UseGuards(RolesGuard(Role.USER), UserOwnerGuard)
  findOrders(@Param('id') id: string) {
    //return this.userService.findOrders(id);
  }
}
