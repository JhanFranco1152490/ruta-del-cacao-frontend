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

// Una existencia de la finca (un lote y un calibre), de donde sale cada línea de la venta.
export type FarmStockRow = Schemas['StockRow'];
export type FarmStockPage = Schemas['PaginatedStockRowList'];

// Los códigos con los que el servidor rechaza una escritura de ventas.
export const SALE_ERROR = {
  stockInsufficient: 'stock_insufficient',
  lotInvalidStatus: 'lot_invalid_status',
  notFound: 'not_found',
  buyerInactive: 'buyer_inactive',
  farmInactive: 'farm_inactive',
  saleVoided: 'sale_voided',
  staleVersion: 'stale_version',
  invoiceTooLarge: 'invoice_too_large',
  invoiceFormat: 'invoice_format_not_allowed',
} as const;
