import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductPromotionDto } from './dto/update-product-promotion.dto';
import { ProductEntity } from './entities/product.entity';
import { Product } from '../models/product.model';
import { Promotion } from '../models/promotion.model';
import { Money } from '../models/money.model';

@Injectable()
export class ProductService {
  private applyDiscountFromPromotion(product: Product) {
    const promotion = product.promotion as Promotion | undefined;
    if (!promotion || !promotion.active) {
      product.discountPrice = undefined;
      return;
    }

    const originalAmount = product.price?.amount;
    if (typeof originalAmount !== 'number') {
      throw new BadRequestException(
        'Product price is required to calculate promotion',
      );
    }

    const currency = product.price.currency;
    if (promotion.type === 'percentage') {
      const percentage = Math.max(0, Math.min(100, promotion.percentage ?? 0));
      const discountedAmount = Math.round(
        (originalAmount * (100 - percentage)) / 100,
      );
      product.discountPrice = {
        amount: Math.max(0, discountedAmount),
        currency,
      };
      return;
    }

    const fixedAmount = promotion.amount?.amount ?? 0;
    const discountedAmount = originalAmount - fixedAmount;
    product.discountPrice = {
      amount: Math.max(0, discountedAmount),
      currency,
    };
  }

  private buildPromotionForUpdate(
    existingPromotion: Promotion | undefined,
    dto: UpdateProductPromotionDto,
  ): Promotion {
    const type = (dto.type ?? existingPromotion?.type) as
      | 'percentage'
      | 'fixed'
      | undefined;
    if (!type) throw new BadRequestException('Promotion type is required');

    if (type === 'percentage') {
      const percentage =
        dto.percentage ?? (existingPromotion as any)?.percentage;
      if (percentage === undefined) {
        throw new BadRequestException(
          'Percentage value is required for percentage promotion',
        );
      }

      return {
        type: 'percentage',
        active: dto.active,
        percentage,
      };
    }

    const amount = dto.amount ?? (existingPromotion as any)?.amount;
    if (!amount || typeof amount.amount !== 'number') {
      throw new BadRequestException('Amount is required for fixed promotion');
    }

    const normalizedAmount: Money = {
      amount: amount.amount,
      currency: amount.currency,
    };

    return {
      type: 'fixed',
      active: dto.active,
      amount: normalizedAmount,
    };
  }

  async create(businessId: string, createProductDto: CreateProductDto) {
    const product = new Product({
      businessId,
      ...createProductDto,
    } as any);

    this.applyDiscountFromPromotion(product);

    const data = ProductEntity.toFirestore(product);
    const ref = await ProductEntity.collectionRef(businessId).add(data);
    const saved = await ref.get();
    return ProductEntity.fromFirestore(saved);
  }

  async findOne(businessId: string, id: string) {
    const doc = await ProductEntity.docRef(businessId, id).get();
    if (!doc.exists) throw new NotFoundException('Product not found');
    return ProductEntity.fromFirestore(doc);
  }

  async findByBusiness(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => ProductEntity.fromFirestore(d));
  }

  async findAvailableByBusiness(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .where('available', '==', true)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => ProductEntity.fromFirestore(d));
  }

  async update(
    businessId: string,
    productId: string,
    updateProductDto: UpdateProductDto,
  ) {
    const docRef = ProductEntity.docRef(businessId, productId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Product not found');

    const existing = ProductEntity.fromFirestore(doc);

    const merged = Object.assign(
      new Product(existing),
      updateProductDto as any,
    );
    this.applyDiscountFromPromotion(merged);
    const data = ProductEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return ProductEntity.fromFirestore(updated);
  }

  async updatePromotion(
    businessId: string,
    productId: string,
    updatePromotionDto: UpdateProductPromotionDto,
  ) {
    const docRef = ProductEntity.docRef(businessId, productId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Product not found');

    const existing = ProductEntity.fromFirestore(doc);
    const merged = new Product(existing);
    merged.promotion = this.buildPromotionForUpdate(
      existing.promotion as Promotion | undefined,
      updatePromotionDto,
    );

    this.applyDiscountFromPromotion(merged);

    const data = ProductEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return ProductEntity.fromFirestore(updated);
  }

  async updateAvailability(
    businessId: string,
    productId: string,
    available: boolean,
  ) {
    const docRef = ProductEntity.docRef(businessId, productId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Product not found');

    const existing = ProductEntity.fromFirestore(doc);
    const merged = Object.assign(new Product(existing), { available });

    const data = ProductEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return ProductEntity.fromFirestore(updated);
  }

  async remove(businessId: string, productId: string) {
    const docRef = ProductEntity.docRef(businessId, productId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Product not found');

    await docRef.delete();
    return { id: productId };
  }
}
