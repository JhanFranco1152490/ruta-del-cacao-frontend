import type { ReactNode } from 'react';

import { SessionGuard } from '@/features/auth/components/session-guard';
import { SessionShell } from '@/features/auth/components/session-shell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGuard>
      <SessionShell>{children}</SessionShell>
    </SessionGuard>
  );
}
