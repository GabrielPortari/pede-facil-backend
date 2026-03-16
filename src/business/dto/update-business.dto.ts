import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateBusinessDto } from './create-business.dto';

class UpdateBusinessBaseDto extends OmitType(CreateBusinessDto, [
  'active',
  'verified',
] as const) {}

export class UpdateBusinessDto extends PartialType(UpdateBusinessBaseDto) {}
