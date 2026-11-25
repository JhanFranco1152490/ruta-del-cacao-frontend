import type { AuditRecordType } from './api';

// Un registro por tipo para que TypeScript avise si el servidor suma uno y aquí falta. El orden es
// el del servidor, el mismo en que `/options` los ofrece.
const KNOWN: Record<AuditRecordType, true> = {
  farm: true,
  plot: true,
  plot_characterization: true,
  input: true,
  activity: true,
  harvest: true,
  lot: true,
  facility: true,
  fermentation: true,
  drying: true,
  quality: true,
  stock: true,
  warehouse: true,
  buyer: true,
  sale: true,
  account: true,
  role: true,
};

export const AUDIT_RECORD_TYPES = Object.keys(KNOWN) as AuditRecordType[];

export const isAuditRecordType = (value: string): value is AuditRecordType =>
  Object.hasOwn(KNOWN, value);
