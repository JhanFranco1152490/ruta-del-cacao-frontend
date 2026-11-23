'use client';

import { useQuery } from '@tanstack/react-query';

import { InlineError } from '@/components/form-message';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/lib/api/query-keys';

import { qrSvgDataUrl, qrSvgText } from './qr-files';

// El código dibujado en el navegador a partir de su dirección: no se pide nada al servidor.
export function LotQrImage({
  address,
  lotCode,
}: {
  address: string;
  lotCode: string;
}) {
  const drawing = useQuery({
    queryKey: queryKeys.lots.qrImage(address),
    queryFn: () => qrSvgText(address),
    staleTime: Infinity,
    networkMode: 'always',
  });

  if (drawing.isError) {
    return <InlineError>No fue posible dibujar el código QR.</InlineError>;
  }
  if (!drawing.data) {
    return <Skeleton className="mx-auto size-56" role="status" />;
  }
  return (
    // Fondo blanco fijo: un lector de QR necesita el contraste del código sobre blanco.
    // eslint-disable-next-line @next/next/no-img-element -- es un dibujo generado en el navegador
    <img
      alt={`Código QR del lote ${lotCode}`}
      className="mx-auto size-56 rounded-md border bg-white"
      src={qrSvgDataUrl(drawing.data)}
    />
  );
}
