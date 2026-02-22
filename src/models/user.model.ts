import { Address } from './address.model';
import { BaseModel } from './base.model';

export class User extends BaseModel {
  name: string;
  document?: string;
  address?: Address;
  email?: string;
  contact?: string;

  constructor(init?: Partial<User>) {
    super(init);
    Object.assign(this, init);
  }
}
