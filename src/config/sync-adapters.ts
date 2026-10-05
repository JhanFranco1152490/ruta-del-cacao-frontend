import { characterizationSyncAdapter } from '@/features/crops/sync-adapter';
import { farmSyncAdapter } from '@/features/farms/sync-adapter';
import { plotSyncAdapter } from '@/features/plots/sync-adapter';
import type { SyncAdapter } from '@/lib/offline/adapters';

// Recursos que se capturan sin conexión. Cada uno nuevo se suma aquí: sin su adapter, lo que
// esté en la cola se queda pendiente sin enviarse.
export const SYNC_ADAPTERS: readonly SyncAdapter[] = [
  farmSyncAdapter,
  plotSyncAdapter,
  characterizationSyncAdapter,
];
