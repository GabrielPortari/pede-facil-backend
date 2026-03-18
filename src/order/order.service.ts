import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { Collections } from 'src/constants/collections';
import { ProductEntity } from 'src/product/entities/product.entity';
import { ListBusinessOrdersQueryDto } from './dto/list-business-orders-query.dto';
import { UserEntity } from 'src/user/entities/user.entity';
import {
  BusinessOrderStatusUpdate,
  OrderStatus,
  UserOrderStatusUpdate,
} from './order-status.constants';

const USER_STATUS_TRANSITIONS: Record<UserOrderStatusUpdate, OrderStatus[]> = {
  customer_cancelled: ['payment_pending'],
  customer_confirmed: ['delivered'],
};

const BUSINESS_STATUS_TRANSITIONS: Record<
  BusinessOrderStatusUpdate,
  OrderStatus[]
> = {
  paid_awaiting_delivery: ['payment_pending'],
  delivered: ['paid_awaiting_delivery'],
  business_cancelled: ['payment_pending', 'paid_awaiting_delivery'],
};

@Injectable()
export class OrderService {
  async listForBusiness(
    businessId: string,
    query: ListBusinessOrdersQueryDto = {},
  ) {
    const db = admin.firestore();
    const limit = query.limit ?? 50;

    let ordersQuery: any = db
      .collection(Collections.ORDERS)
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc');

    if (query.status) {
      ordersQuery = ordersQuery.where('status', '==', query.status);
    }

    const snapshot = await ordersQuery.limit(limit).get();

    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...(doc.data() ?? {}),
    }));
  }

  async findOneForBusiness(orderId: string, businessId: string) {
    const doc = await admin
      .firestore()
      .collection(Collections.ORDERS)
      .doc(orderId)
      .get();

    if (!doc.exists) {
      throw new NotFoundException('Order not found');
    }

    const data = doc.data() ?? {};
    if (data.businessId !== businessId) {
      // Avoids leaking order existence across businesses.
      throw new NotFoundException('Order not found');
    }

    return { id: doc.id, ...data };
  }

  async simulatePayment(userId: string, orderId: string) {
    return this.updateOrderStatus({
      orderId,
      ownerField: 'userId',
      ownerId: userId,
      nextStatus: 'paid_awaiting_delivery',
      allowedCurrentStatuses: ['payment_pending'],
    });
  }

  async updateStatusForUser(
    userId: string,
    orderId: string,
    nextStatus: UserOrderStatusUpdate,
  ) {
    return this.updateOrderStatus({
      orderId,
      ownerField: 'userId',
      ownerId: userId,
      nextStatus,
      allowedCurrentStatuses: USER_STATUS_TRANSITIONS[nextStatus],
    });
  }

  async updateStatusForBusiness(
    businessId: string,
    orderId: string,
    nextStatus: BusinessOrderStatusUpdate,
  ) {
    return this.updateOrderStatus({
      orderId,
      ownerField: 'businessId',
      ownerId: businessId,
      nextStatus,
      allowedCurrentStatuses: BUSINESS_STATUS_TRANSITIONS[nextStatus],
    });
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    if (!userId) throw new BadRequestException('User not authenticated');

    const db = admin.firestore();

    const userSnap = await UserEntity.docRef(userId).get();
    const userName: string = userSnap.exists
      ? ((userSnap.data() as any)?.name ?? 'Unknown')
      : 'Unknown';

    const normalizedClientOrderId = this.normalizeClientOrderId(
      createOrderDto.clientOrderId,
    );
    const orderRef = normalizedClientOrderId
      ? db
          .collection(Collections.ORDERS)
          .doc(
            this.buildIdempotentOrderDocId(
              userId,
              createOrderDto.businessId,
              normalizedClientOrderId,
            ),
          )
      : db.collection(Collections.ORDERS).doc();

    const result = await db.runTransaction(async (tx) => {
      if (normalizedClientOrderId) {
        const existingOrderDoc = await tx.get(orderRef);
        if (existingOrderDoc.exists) {
          const existingData = existingOrderDoc.data() ?? {};
          return { id: existingOrderDoc.id, ...existingData };
        }
      }

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

        if (p.available === false) {
          throw new BadRequestException(`Product ${p.name} is unavailable`);
        }

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
        });
      }

      const orderData = {
        userId,
        userName,
        businessId: createOrderDto.businessId,
        items: processedItems,
        totalPrice: { amount: total, currency: 'BRL' },
        status: 'payment_pending',
        paymentMethod: createOrderDto.paymentMethod,
        observations: createOrderDto.observations ?? null,
        clientOrderId: normalizedClientOrderId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any;

      tx.set(orderRef, orderData);
      return { id: orderRef.id, ...orderData };
    });

    return result;
  }

  private normalizeClientOrderId(clientOrderId?: string | null): string | null {
    const normalized = String(clientOrderId || '').trim();
    return normalized.length > 0 ? normalized : null;
  }

  private buildIdempotentOrderDocId(
    userId: string,
    businessId: string,
    clientOrderId: string,
  ) {
    const raw = `${userId}:${businessId}:${clientOrderId}`;
    const digest = createHash('sha256').update(raw).digest('hex').slice(0, 32);
    return `idem_${digest}`;
  }

  private async updateOrderStatus(params: {
    orderId: string;
    ownerField: 'userId' | 'businessId';
    ownerId: string;
    nextStatus: OrderStatus;
    allowedCurrentStatuses: OrderStatus[];
  }) {
    const { orderId, ownerField, ownerId, nextStatus, allowedCurrentStatuses } =
      params;

    const db = admin.firestore();
    const orderRef = db.collection(Collections.ORDERS).doc(orderId);

    return db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);
      if (!orderDoc.exists) {
        throw new NotFoundException('Order not found');
      }

      const orderData = orderDoc.data() ?? {};
      if (orderData[ownerField] !== ownerId) {
        // Prevents leaking existence to foreign users/businesses.
        throw new NotFoundException('Order not found');
      }

      const currentStatus = orderData.status as OrderStatus;
      if (currentStatus === nextStatus) {
        return { id: orderDoc.id, ...orderData };
      }

      if (!allowedCurrentStatuses.includes(currentStatus)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${nextStatus}`,
        );
      }

      const updatedAt = admin.firestore.FieldValue.serverTimestamp();
      tx.update(orderRef, {
        status: nextStatus,
        updatedAt,
      });

      return {
        id: orderDoc.id,
        ...orderData,
        status: nextStatus,
        updatedAt,
      };
    });
  }
}
