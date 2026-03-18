export const ORDER_STATUSES = [
  'payment_pending',
  'paid_awaiting_delivery',
  'delivered',
  'customer_confirmed',
  'customer_cancelled',
  'business_cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const USER_ORDER_STATUS_UPDATES = [
  'customer_confirmed',
  'customer_cancelled',
] as const;

export type UserOrderStatusUpdate = (typeof USER_ORDER_STATUS_UPDATES)[number];

export const BUSINESS_ORDER_STATUS_UPDATES = [
  'paid_awaiting_delivery',
  'delivered',
  'business_cancelled',
] as const;

export type BusinessOrderStatusUpdate =
  (typeof BUSINESS_ORDER_STATUS_UPDATES)[number];
