import type { ReactNode } from 'react';

// Lo que Ventas le pide a quien arma la página para registrar un comprador sin salir del
// formulario. Ventas no importa de Compradores: la página de `app/` entrega esta función.
export type NewBuyerDialogProps = {
  // El productor del formulario: la cuenta técnica lo eligió antes de empezar.
  producer: string | null;
  chooseProducer: boolean;
  // Lo que dice el botón que lleva al comprador que ya existe con ese documento.
  existingLabel: string;
  onClose: () => void;
  // El comprador que quedó listo para vender.
  onDone: (buyerId: string) => void;
};

export type RenderNewBuyer = (props: NewBuyerDialogProps) => ReactNode;
