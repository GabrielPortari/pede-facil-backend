import { Money } from './money.model';

export interface BasePromotion {
  active: boolean;
  from?: Date;
  to?: Date;
}

/** Promoção percentual (ex: 10 = 10%) */
export interface PercentagePromotion extends BasePromotion {
  type: 'percentage';
  percentage: number;
}

/** Promoção fixa (valor em centavos) */
export interface FixedPromotion extends BasePromotion {
  type: 'fixed';
  amount: Money;
}

export type Promotion = PercentagePromotion | FixedPromotion;
