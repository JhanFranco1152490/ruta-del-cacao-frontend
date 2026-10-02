import type { ReactNode } from 'react';

import { OnlineOnly } from '@/components/online-only';

export default function ProducersLayout({ children }: { children: ReactNode }) {
  return <OnlineOnly>{children}</OnlineOnly>;
}
