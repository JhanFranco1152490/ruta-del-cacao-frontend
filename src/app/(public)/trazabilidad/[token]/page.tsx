import type { Metadata } from 'next';

import { PublicTraceabilityScreen } from '@/features/lots/components/traceability/public-traceability-screen';

// La página se llega solo con el código QR: no debe salir en los buscadores.
export const metadata: Metadata = {
  title: 'Trazabilidad del lote',
  robots: { index: false, follow: false },
};

export default async function PublicTraceabilityPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicTraceabilityScreen token={token} />;
}
