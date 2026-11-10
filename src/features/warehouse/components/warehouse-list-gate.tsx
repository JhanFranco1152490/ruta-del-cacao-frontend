'use client';

import type { ReactNode } from 'react';

import { ErrorState } from '@/components/error-state';
import { LoadingBlock } from '@/components/loading-block';
import { NeverLoadedState } from '@/components/never-loaded-state';
import type { CachedRead } from '@/lib/offline/cached-read';
import { isNeverLoaded } from '@/lib/offline/paused-read';

type ListQuery<T> = {
  data: CachedRead<T> | undefined;
  isPending: boolean;
  fetchStatus: string;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
};

// Lo que reemplaza a una pestaña de Bodega mientras no hay qué mostrar: falta elegir el productor,
// nunca se cargó y no hay conexión, se está cargando o falló. Con datos, dibuja la pestaña.
export function WarehouseListGate<T>({
  needsProducer,
  query,
  loadingLabel,
  errorMessage,
  children,
}: {
  needsProducer: boolean;
  query: ListQuery<T>;
  loadingLabel: string;
  errorMessage: string;
  children: (data: T) => ReactNode;
}) {
  if (needsProducer) {
    return (
      <p className="text-muted-foreground">
        Elige un productor para ver su bodega.
      </p>
    );
  }
  if (isNeverLoaded(query)) {
    return <NeverLoadedState subject="la bodega" />;
  }
  if (query.isPending) {
    return <LoadingBlock label={loadingLabel} shapes={['h-40']} />;
  }
  if (!query.data) {
    return (
      <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
    );
  }
  return children(query.data.data);
}
