import type { QueueView } from '@/components/sync-tray/queue-view';
import { farmQueueView } from '@/features/farms/queue-view';

// Cómo se ve cada recurso en la bandeja de registros del dispositivo. Cada recurso nuevo que se
// captura sin conexión se suma aquí, junto a su adapter en sync-adapters.ts.
export const QUEUE_VIEWS: readonly QueueView[] = [farmQueueView];
