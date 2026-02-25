import { Money } from './money.model';
import { ItemOptions } from './itemOptions.model';

export class OrderItem {
  productId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;
  options?: ItemOptions;

  constructor(init?: Partial<OrderItem>) {
    Object.assign(this, init);
  }
}
