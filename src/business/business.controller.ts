import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
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
  async findMe(@IdToken() token: string) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.businessService.findOne(uid);
  }

  @Patch('me')
  @UseGuards(RolesGuard(Role.BUSINESS))
  async updateMe(
    @IdToken() token: string,
    @Body() updateBusinessDto: UpdateBusinessDto,
  ) {
    const { uid } = await this.firebaseService.verifyIdToken(token, true);
    return this.businessService.update(uid, updateBusinessDto);
  }

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
