import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { IdToken } from 'src/auth/dto/id-token.decorator';
import { Role } from 'src/constants/roles';
import { FirebaseService } from 'src/firebase/firebase.service';
import { RolesGuard } from 'src/roles/roles.guard';
import { OrderService } from './order.service';
import { ListBusinessOrdersQueryDto } from './dto/list-business-orders-query.dto';

@Controller('business/me/orders')
export class BusinessOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Get()
  @UseGuards(RolesGuard(Role.BUSINESS))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lista os pedidos do negócio autenticado' })
  @ApiResponse({ status: 200, description: 'Pedidos do negócio retornados.' })
  async findMine(
    @IdToken() token: string,
    @Query() query: ListBusinessOrdersQueryDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.listForBusiness(uid, query);
  }

  @Get(':id')
  @UseGuards(RolesGuard(Role.BUSINESS))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtém um pedido do negócio autenticado por ID' })
  @ApiResponse({ status: 200, description: 'Pedido retornado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Pedido não encontrado.' })
  async findOneMine(@IdToken() token: string, @Param('id') id: string) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.findOneForBusiness(id, uid);
  }
}
