import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import * as admin from 'firebase-admin';
import { Collections } from 'src/constants/collections';
import { ProductEntity } from 'src/product/entities/product.entity';

@Injectable()
export class OrderService {
  async create(userId: string, createOrderDto: CreateOrderDto) {
    if (!userId) throw new BadRequestException('User not authenticated');

    const db = admin.firestore();
    const orderRef = db.collection(Collections.ORDERS).doc();

    const result = await db.runTransaction(async (tx) => {
      let total = 0;
      const processedItems: any[] = [];

      for (const item of createOrderDto.items) {
        const prodRef = ProductEntity.docRef(
          createOrderDto.businessId,
          item.productId,
        );
        const prodSnap = await tx.get(prodRef);
        if (!prodSnap.exists)
          throw new NotFoundException(`Product ${item.productId} not found`);

        const p = ProductEntity.fromFirestore(prodSnap) as any;

        // availability and stock checks
        if (p.useStock && (p.stock ?? 0) < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${p.name}`,
          );
        }

        if (
          p.promotion?.active &&
          p.usePromotionStock &&
          (p.promotionStock ?? 0) < item.quantity
        ) {
          throw new BadRequestException(
            `Insufficient promotion stock for product ${p.name}`,
          );
        }

        const currency = p.price?.currency ?? 'BRL';
        const unitAmount = (
          p.promotion?.active
            ? (p.discountPrice?.amount ?? p.price?.amount)
            : p.price?.amount
        ) as number;
        const subtotal = unitAmount * item.quantity;
        total += subtotal;

        // decrement stocks inside transaction
        const updates: Record<string, any> = {};
        if (p.useStock) updates.stock = (p.stock ?? 0) - item.quantity;
        if (p.useStock && (p.stock ?? 0) - item.quantity <= 0)
          updates.available = false;
        if (p.promotion?.active && p.usePromotionStock)
          updates.promotionStock = (p.promotionStock ?? 0) - item.quantity;

        if (Object.keys(updates).length > 0) tx.update(prodRef, updates);

        processedItems.push({
          productId: item.productId,
          name: p.name,
          unitPrice: { amount: unitAmount, currency },
          quantity: item.quantity,
          subtotal: { amount: subtotal, currency },
          options: item.options,
        });
      }

      const orderData = {
        userId,
        businessId: createOrderDto.businessId,
        items: processedItems,
        totalPrice: { amount: total, currency: 'BRL' },
        status: 'payment_pending',
        paymentMethod: createOrderDto.paymentMethod,
        clientNotes: createOrderDto.clientNotes ?? null,
        clientOrderId: createOrderDto.clientOrderId ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any;

      tx.set(orderRef, orderData);
      return { id: orderRef.id, ...orderData };
    });

    return result;
  }
}
