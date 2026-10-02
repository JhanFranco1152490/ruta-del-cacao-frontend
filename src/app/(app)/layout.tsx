import type { ReactNode } from 'react';

import { QUEUE_VIEWS } from '@/config/queue-views';
import { SessionGuard } from '@/features/auth/components/session-guard';
import { SessionShell } from '@/features/auth/components/session-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SessionShell queueViews={QUEUE_VIEWS}>{children}</SessionShell>
    </SessionGuard>
  );
}
