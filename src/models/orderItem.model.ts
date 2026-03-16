import { Money } from './money.model';

export class OrderItem {
  productId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;

  constructor(init?: Partial<OrderItem>) {
    Object.assign(this, init);
  }
}
