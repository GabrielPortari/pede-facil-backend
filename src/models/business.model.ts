import { Address } from './address.model';
import { BaseModel } from './base.model';

export class Business extends BaseModel {
  name: string;
  logoUrl?: string;
  address: Address;
  contact: string;
  email: string;

  constructor(init?: Partial<Business>) {
    super(init);
    Object.assign(this, init);
  }
}
