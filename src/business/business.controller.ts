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
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { Role } from 'src/constants/roles';
import { RolesGuard } from 'src/roles/roles.guard';

@Controller('business')
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  findAll() {
    return this.businessService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard(Role.BUSINESS))
  update(
    @Param('id') id: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    return this.businessService.update(id, updateBusinessDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard(Role.ADMIN))
  remove(@Param('id') id: string) {
    return this.businessService.remove(id);
  }
}
