import { BaseModel } from './base.model';
import { Money } from './money.model';
import { Promotion } from './promotion.model';

export class Product extends BaseModel {
  businessId: string;
  name: string;
  description?: string;
  price: Money;
  discountPrice?: Money;
  imageUrl?: string;
  available?: boolean;
  stock?: number;
  useStock?: boolean;
  promotion?: Promotion;
  promotionStock?: number;
  usePromotionStock?: boolean;

  constructor(init?: Partial<Product>) {
    super(init);
    Object.assign(this, init);
  }
}
