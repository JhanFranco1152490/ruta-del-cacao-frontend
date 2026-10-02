import type { ReactNode } from 'react';

import { OnlineOnly } from '@/components/online-only';

export default function UsersLayout({ children }: { children: ReactNode }) {
  return <OnlineOnly>{children}</OnlineOnly>;
}
