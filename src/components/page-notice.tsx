import type { ReactNode } from 'react';

import { EmptyState } from '@/components/empty-state';
import { pageContainerClass } from '@/components/page-container';

// Aviso que ocupa el lugar de una pantalla completa, con el mismo margen que las pantallas.
export function PageNotice({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className={pageContainerClass('wide')}>
      <EmptyState action={action} description={description} title={title} />
    </div>
  );
}
