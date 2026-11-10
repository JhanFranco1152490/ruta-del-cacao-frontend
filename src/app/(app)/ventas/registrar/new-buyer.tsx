'use client';

import { NewBuyerDialog } from '@/features/buyers/components/new-buyer-dialog';
import type { RenderNewBuyer } from '@/features/sales/sale-new-buyer';

// Ventas y Compradores no se importan entre sí: aquí se une el formulario de una venta con quien
// registra al comprador.
export const renderNewBuyer: RenderNewBuyer = (props) => (
  <NewBuyerDialog {...props} />
);
