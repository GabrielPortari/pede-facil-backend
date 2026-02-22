import { Address } from './address.model';
import { BaseModel } from './base.model';

export class Business extends BaseModel {
  name: string;
  logoUrl?: string;
  address?: Address;
  contact: string; //TODO: tipar com formato de telefone
  email: string; //TODO: tipar com formato de email

  constructor(init?: Partial<Business>) {
    super(init);
    Object.assign(this, init);
  }
}
