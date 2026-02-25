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

    // If promotions use a separate promotion stock and it's depleted,
    // do not apply the promotion pricing.
    if (product.usePromotionStock && (product.promotionStock ?? 0) <= 0) {
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

    // enforce availability based on stock settings on create
    if (product.useStock && (product.stock ?? 0) <= 0) {
      product.available = false;
    }

    // validate promotion stock constraints
    this.validatePromotionStock(product);

    this.applyDiscountFromPromotion(product);

    const data = ProductEntity.toFirestore(product);
    const ref = await ProductEntity.collectionRef(businessId).add(data);
    const saved = await ref.get();
    return ProductEntity.fromFirestore(saved);
  }

  async findOne(businessId: string, id: string) {
    const doc = await ProductEntity.docRef(businessId, id).get();
    if (!doc.exists) throw new NotFoundException('Product not found');
    const product = ProductEntity.fromFirestore(doc);
    // normalize computed fields before returning
    this.normalizeProduct(product);
    return product;
  }

  async findByBusiness(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map((d) => {
      const p = ProductEntity.fromFirestore(d);
      this.normalizeProduct(p);
      return p;
    });
  }

  async findAvailableByBusiness(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs
      .map((d) => ProductEntity.fromFirestore(d))
      .filter((p) => {
        // compute availability from stock settings
        if (p.useStock) {
          return (p.stock ?? 0) > 0;
        }
        return !!p.available;
      })
      .map((p) => {
        this.normalizeProduct(p);
        return p;
      });
  }

  async findProductsInPromotion(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs
      .map((d) => ProductEntity.fromFirestore(d))
      .filter((p) => {
        if (!p.promotion?.active) return false;
        // if promotion uses stock, ensure there's promotion stock
        if (p.usePromotionStock) return (p.promotionStock ?? 0) > 0;
        return true;
      })
      .map((p) => {
        this.normalizeProduct(p);
        return p;
      });
  }

  async findProductsWithoutPromotion(businessId: string) {
    const snapshot = await ProductEntity.collectionRef(businessId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs
      .map((d) => ProductEntity.fromFirestore(d))
      .filter((product) => {
        if (!product.promotion?.active) return true;
        // if promotion is active but uses promotion stock and stock depleted,
        // treat it as without promotion
        if (product.usePromotionStock && (product.promotionStock ?? 0) <= 0)
          return true;
        return false;
      })
      .map((p) => {
        this.normalizeProduct(p);
        return p;
      });
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

    // enforce availability rules when using stock
    if (merged.useStock && (merged.stock ?? 0) <= 0) {
      merged.available = false;
    }

    // validate promotion stock constraints after merging
    this.validatePromotionStock(merged);

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

    // copy promotion stock settings from DTO when provided
    if (typeof (updatePromotionDto as any).usePromotionStock !== 'undefined') {
      merged.usePromotionStock = (updatePromotionDto as any).usePromotionStock;
    }
    if (typeof (updatePromotionDto as any).promotionStock !== 'undefined') {
      merged.promotionStock = (updatePromotionDto as any).promotionStock;
    }

    // validate promotion stock constraints
    this.validatePromotionStock(merged);

    // apply computed discount if allowed
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

    // if the product uses stock and stock is zero, availability must be false
    if (merged.useStock && (merged.stock ?? 0) <= 0) {
      merged.available = false;
    }

    const data = ProductEntity.toFirestore(merged);
    await docRef.update(data);
    const updated = await docRef.get();
    return ProductEntity.fromFirestore(updated);
  }

  // normalize computed fields that depend on stock and promotion stock
  private normalizeProduct(product: Product) {
    // availability computed from stock when useStock is true
    if (product.useStock) {
      if ((product.stock ?? 0) <= 0) product.available = false;
    }

    // apply promotion discount only when promotion active and promotionStock available
    this.applyDiscountFromPromotion(product);
  }

  // ensure promotionStock is strictly less than normal stock when enabled
  private validatePromotionStock(product: Product) {
    if (product.usePromotionStock) {
      const promoStock = product.promotionStock ?? null;
      const normalStock = product.stock ?? null;
      if (promoStock === null || normalStock === null) {
        throw new BadRequestException(
          'promotionStock requires product stock to be defined when usePromotionStock is true',
        );
      }

      if (typeof promoStock !== 'number' || typeof normalStock !== 'number') {
        throw new BadRequestException('Invalid stock values');
      }

      if (!(promoStock < normalStock)) {
        throw new BadRequestException(
          'promotionStock must be strictly less than stock',
        );
      }
    }
  }

  async remove(businessId: string, productId: string) {
    const docRef = ProductEntity.docRef(businessId, productId);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Product not found');

    await docRef.delete();
    return { id: productId };
  }
}
