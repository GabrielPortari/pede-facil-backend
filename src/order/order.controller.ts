import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RolesGuard } from 'src/roles/roles.guard';
import { Role } from 'src/constants/roles';
import { IdToken } from 'src/auth/dto/id-token.decorator';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UpdateUserOrderStatusDto } from './dto/update-user-order-status.dto';

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

  @Post(':id/simulate-payment')
  @UseGuards(RolesGuard(Role.USER))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Simula o pagamento de um pedido do usuário' })
  @ApiResponse({
    status: 200,
    description: 'Pagamento simulado com sucesso.',
    schema: {
      example: {
        id: 'order_123',
        status: 'paid_awaiting_delivery',
        paymentMethod: 'pix',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Transição de status inválida para simulação de pagamento.',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid status transition from delivered to paid_awaiting_delivery',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Pedido não encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async simulatePayment(@IdToken() token: string, @Param('id') id: string) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.simulatePayment(uid, id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard(Role.USER))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualiza o status de um pedido do usuário' })
  @ApiBody({
    description: 'Status permitido para o usuário autenticado',
    schema: {
      example: {
        status: 'customer_confirmed',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso.',
    schema: {
      example: {
        id: 'order_123',
        status: 'customer_confirmed',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Transição de status inválida.',
    schema: {
      example: {
        statusCode: 400,
        message:
          'Invalid status transition from payment_pending to customer_confirmed',
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Pedido não encontrado.',
    schema: {
      example: {
        statusCode: 404,
        message: 'Order not found',
        error: 'Not Found',
      },
    },
  })
  async updateStatus(
    @IdToken() token: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserOrderStatusDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.updateStatusForUser(uid, id, dto.status);
  }
}
