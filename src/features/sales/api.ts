import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type Sale = Schemas['Sale'];
// La lista y la ficha traen lo mismo, menos las líneas: la lista ya lleva los kilos y el total.
export type SaleListItem = Schemas['SaleListItem'];
export type SalePage = Schemas['PaginatedSaleListItemList'];
export type SaleLine = Schemas['SaleLine'];
export type SaleStatus = Schemas['SaleStatusEnum'];
export type SaleInvoice = Schemas['SaleInvoice'];
export type SaleSummary = Schemas['SaleSummary'];
export type SaleCreateRequest = Schemas['SaleCreateRequest'];
export type SaleLineRequest = Schemas['SaleLineRequestRequest'];
export type SaleVoidRequest = Schemas['SaleVoidRequestRequest'];
export type BuyerOption = Schemas['BuyerOption'];
// El 409: `current` llega con `stale_version`.
export type SaleConflictError = Schemas['SaleConflictError'];

// Los errores de una línea llegan sin índice en `fields.lines`; los que dependen del momento
// (`stock_insufficient`, `lot_invalid_status` y el lote de otra finca) dicen además cuál es con
// `line`, desde 0. El esquema no los describe porque son claves extra junto a `code`.
export type SaleLineError = {
  detail: string;
  code: string;
  fields?: Record<string, string[]>;
  line?: number;
  available_kg?: string;
  current_status?: string;
};
