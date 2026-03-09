import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from 'src/roles/roles.guard';
import { Role } from 'src/constants/roles';
import { IdToken } from 'src/auth/dto/id-token.decorator';
import { FirebaseService } from 'src/firebase/firebase.service';

@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly firebaseService: FirebaseService,
  ) {}

  @Post()
  @UseGuards(RolesGuard(Role.USER))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria um novo pedido para o usuário autenticado' })
  @ApiResponse({ status: 201, description: 'Pedido criado com sucesso.' })
  async create(
    @IdToken() token: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.create(uid, createOrderDto);
  }
}
