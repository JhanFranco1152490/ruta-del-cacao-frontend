export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  errorCount: number;
  isWithinOfflineWindow: boolean;
}
