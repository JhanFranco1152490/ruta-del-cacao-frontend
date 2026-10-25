'use client';

import { useSearchParams } from 'next/navigation';

import { PageNotice } from '@/components/page-notice';
import { LogScreen } from '@/features/drying/components/log-screen';
import { lotDetailPath } from '@/features/lots/lot-paths';

export function LogFromQuery() {
  const params = useSearchParams();
  const lotId = params.get('lote');
  const pendingId = params.get('pendiente') ?? undefined;
  const logId = params.get('id') ?? undefined;
  if (!lotId) return <PageNotice title="Falta el lote de la bitácora." />;
  // Otro lote u otra bitácora es otra captura: la pantalla se monta de nuevo.
  return (
    <LogScreen
      key={`${lotId}:${pendingId ?? ''}:${logId ?? ''}`}
      logId={logId}
      lotHref={lotDetailPath}
      lotId={lotId}
      pendingId={pendingId}
    />
  );
}
