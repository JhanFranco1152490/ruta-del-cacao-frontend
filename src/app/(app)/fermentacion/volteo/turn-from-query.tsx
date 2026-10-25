'use client';

import { useSearchParams } from 'next/navigation';

import { PageNotice } from '@/components/page-notice';
import { TurnScreen } from '@/features/fermentation/components/turn-screen';
import { lotDetailPath } from '@/features/lots/lot-paths';

export function TurnFromQuery() {
  const params = useSearchParams();
  const lotId = params.get('lote');
  const pendingId = params.get('pendiente') ?? undefined;
  const turnId = params.get('id') ?? undefined;
  if (!lotId) return <PageNotice title="Falta el lote del volteo." />;
  // Otro lote u otro volteo es otra captura: la pantalla se monta de nuevo.
  return (
    <TurnScreen
      key={`${lotId}:${pendingId ?? ''}:${turnId ?? ''}`}
      lotHref={lotDetailPath}
      lotId={lotId}
      pendingId={pendingId}
      turnId={turnId}
    />
  );
}
