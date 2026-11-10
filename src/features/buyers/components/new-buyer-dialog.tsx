'use client';

import { useSession } from '@/hooks/use-session';
import { notify } from '@/lib/notify';

import { useBuyers } from '../queries';
import { BuyerFormDialog } from './buyer-form-dialog';

// Registrar un comprador desde otra pantalla (una venta) sin salir de ella. Lee su propio
// directorio para avisar de un documento repetido y, al terminar, entrega el comprador que quedó
// listo: el recién registrado, uno inactivo que se activó o el que ya existía con ese documento.
export function NewBuyerDialog({
  producer,
  chooseProducer,
  existingLabel,
  onClose,
  onDone,
}: {
  // El productor de la pantalla de origen: con él empieza el formulario de la cuenta técnica.
  producer: string | null;
  // Solo la cuenta técnica elige de qué productor es el comprador nuevo.
  chooseProducer: boolean;
  // Lo que dice el botón que lleva al comprador que ya existe con ese documento.
  existingLabel?: string;
  onClose: () => void;
  onDone: (buyerId: string) => void;
}) {
  const { data: user } = useSession();
  const directory = useBuyers(user?.id, chooseProducer ? producer : null);

  return (
    <BuyerFormDialog
      chooseProducer={chooseProducer}
      known={directory.data?.data ?? []}
      onClose={onClose}
      onSaved={(message, saved) => {
        if (message) notify.success(message);
        if (saved) onDone(saved.id);
        onClose();
      }}
      onShowExisting={(id) => {
        onDone(id);
        onClose();
      }}
      producer={producer}
      showExistingLabel={existingLabel}
    />
  );
}
