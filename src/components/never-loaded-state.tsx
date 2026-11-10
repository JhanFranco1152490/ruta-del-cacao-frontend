import { EmptyState } from '@/components/empty-state';
import { OfflineCloud } from '@/components/illustrations/offline-cloud';

// Lo que reemplaza a una lista que nunca se cargó y no tiene copia en el dispositivo (falta la red).
// `subject` es lo que se iba a mostrar, con su artículo («las ventas», «la bodega»); `description`
// dice qué pasa cuando haya conexión, con el género de lo que se guarda.
export function NeverLoadedState({
  subject,
  description,
}: {
  subject: string;
  description?: string;
}) {
  return (
    <EmptyState
      description={description}
      illustration={OfflineCloud}
      title={`Necesitas conexión una vez para cargar ${subject}.`}
    />
  );
}
