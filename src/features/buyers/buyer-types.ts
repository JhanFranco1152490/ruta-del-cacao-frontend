import type { BuyerType } from './api';

// A qué se dedica el comprador, en el orden en que los presenta la historia de usuario. El Record
// obliga a nombrar todos los valores del API: si el backend agrega uno, TypeScript falla aquí.
const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  chocolate_industry: 'Industria chocolatera',
  exporter: 'Exportador',
  intermediary: 'Intermediario o acopiador',
  cooperative: 'Cooperativa o asociación',
  artisan_processor: 'Transformador artesanal',
};

export const BUYER_TYPE_OPTIONS = (
  Object.entries(BUYER_TYPE_LABELS) as [BuyerType, string][]
).map(([value, label]) => ({ value, label }));

export const BUYER_TYPES = Object.keys(BUYER_TYPE_LABELS) as [
  BuyerType,
  ...BuyerType[],
];

export const isBuyerType = (value: string): value is BuyerType =>
  value in BUYER_TYPE_LABELS;

export const buyerTypeLabel = (type: BuyerType) => BUYER_TYPE_LABELS[type];
