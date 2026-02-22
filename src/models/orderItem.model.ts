import { Money } from './money.model';

export class OrderItem {
  productId: string;
  name: string;
  unitPrice: Money;
  quantity: number;
  subtotal: Money;
  options?: string;

  constructor(init?: Partial<OrderItem>) {
    Object.assign(this, init);
  }
}
