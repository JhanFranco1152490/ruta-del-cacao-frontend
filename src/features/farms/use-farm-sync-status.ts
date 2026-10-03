'use client';

import { useCaptureSyncStatus } from '@/hooks/use-capture-sync-status';

export const useFarmSyncStatus = () => useCaptureSyncStatus('fincas');
