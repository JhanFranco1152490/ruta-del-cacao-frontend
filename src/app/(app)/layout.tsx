import type { ReactNode } from 'react';

import { SessionGuard } from '@/features/auth/components/session-guard';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <SessionGuard>{children}</SessionGuard>;
}
