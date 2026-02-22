import { BaseModel } from './base.model';
import { Product } from './product.model';

export class Order extends BaseModel {
  userId: string;
  businessId: string;
  items: Product[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';

  constructor(init?: Partial<Order>) {
    super(init);
    Object.assign(this, init);
  }
}
