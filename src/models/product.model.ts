import { BaseModel } from './base.model';

export class Product extends BaseModel {
  businessId: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  imageUrl?: string;
  promotion: boolean;
  promotionPercentage?: number;

  constructor(init?: Partial<Product>) {
    super(init);
    Object.assign(this, init);
  }
}
