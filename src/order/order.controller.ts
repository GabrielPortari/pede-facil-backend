import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
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
  async create(
    @IdToken() token: string,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.orderService.create(uid, createOrderDto);
  }
}
