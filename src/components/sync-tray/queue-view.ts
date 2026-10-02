import type { ComponentType } from 'react';

import type { QueueItem } from '@/lib/offline/db';

// Cómo se ve en la bandeja un registro de un recurso. Lo registra cada dominio, igual que su
// adapter de sincronización.
export interface QueueView {
  resource: string;
  // El tipo de registro, como "Finca".
  kind: string;
  title(item: QueueItem): string;
  // Corregir y, si falló, descartar. `onNavigate` cierra la bandeja al ir a otra pantalla.
  Actions: ComponentType<{ item: QueueItem; onNavigate: () => void }>;
}
