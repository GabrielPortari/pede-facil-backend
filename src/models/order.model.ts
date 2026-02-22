import { BaseModel } from './base.model';
import { Money } from './money.model';
import { OrderItem } from './orderItem.model';
import { Product } from './product.model';

type OrderStatus =
  | 'payment_pending'
  | 'paid_awaiting_pickup'
  | 'paid_awaiting_delivery'
  | 'picked_up'
  | 'delivered'
  | 'customer_confirmed'
  | 'customer_cancelled'
  | 'business_cancelled';

export class Order extends BaseModel {
  userId: string;
  businessId: string;
  items: OrderItem[];
  totalPrice: Money;
  status: OrderStatus;

  constructor(init?: Partial<Order>) {
    super(init);
    Object.assign(this, init);
  }
}
