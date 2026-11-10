import { kilosText } from '@/lib/stock-quantity';

// Los textos de avisos y diálogos de las ventas, en un solo lugar.

export const OFFLINE_SALES_REASON =
  'Necesitas conexión para registrar o cambiar ventas.';
export const OFFLINE_INVOICE_REASON = 'Ver el soporte necesita conexión.';

export const saleRegistered = (code: string) => `Venta ${code} registrada.`;
export const invoiceNotAttached = (code: string) =>
  `Venta ${code} registrada, pero no se pudo adjuntar el soporte. Adjúntalo desde la venta.`;
// El servidor rechazó la venta por algo que cambió entretanto (lo disponible, el comprador): el
// motivo va en su campo o en su línea.
export const SALE_NOT_REGISTERED =
  'No se registró la venta: revisa lo marcado.';
export const saleVoided = (code: string) => `Venta ${code} anulada.`;
export const INVOICE_ATTACHED = 'Soporte adjuntado.';
export const INVOICE_REMOVED = 'Soporte quitado.';

export const CHANGE_FARM_QUESTION =
  '¿Cambiar de finca? Se quitarán las líneas.';
export const NO_ACTIVE_BUYERS = 'Aún no tienes compradores activos.';
export const NO_STOCK_TO_SELL =
  'Esta finca no tiene cacao en bodega para vender.';

export const voidQuestion = (code: string) => `¿Anular la venta ${code}?`;
// Los kilos de toda la venta, G1 y G2 juntos, que vuelven a bodega.
export const voidConsequence = (totalKg: string | number) =>
  `Los ${kilosText(totalKg)} kg vuelven a las existencias de bodega. La venta queda en el historial como anulada.`;

export const REMOVE_INVOICE_QUESTION =
  '¿Quitar el soporte de la factura? La venta no cambia.';
