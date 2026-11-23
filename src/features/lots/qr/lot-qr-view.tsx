'use client';

import { Download, ExternalLink, Link2 } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { copyText } from '@/lib/copy-text';
import { formatDateTime } from '@/lib/format/dates';
import { endSentence } from '@/lib/format/sentence';

import type { Lot, LotQr } from '../api';
import { LotQrImage } from './lot-qr-image';
import { useQrDownload } from './use-qr-download';

const ACTION_CLASS = 'h-11 w-full gap-2 font-bold';

// El código que el lote ya tiene: se ve, se descarga (PNG para imprimir y SVG para una imprenta),
// se comparte su enlace y se abre la página pública. Nunca ofrece generar otro.
export function LotQrView({ lot, qr }: { lot: Lot; qr: LotQr }) {
  const { pending, download } = useQrDownload(lot.code, qr.public_url);
  return (
    <>
      <DialogHeader>
        <DialogTitle>Código QR del lote</DialogTitle>
        <DialogDescription>
          {`Este lote ya tiene un código QR. ${endSentence(`Generado el ${formatDateTime(qr.created_at)}`)}`}
        </DialogDescription>
      </DialogHeader>
      <LotQrImage address={qr.public_url} lotCode={lot.code} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          className={ACTION_CLASS}
          disabled={pending !== null}
          onClick={() => void download('svg')}
          variant="action"
        >
          <Download aria-hidden="true" />
          {pending === 'svg' ? 'Descargando…' : 'Descargar SVG'}
        </Button>
        <Button
          className={ACTION_CLASS}
          onClick={() =>
            void copyText(qr.public_url, {
              success: 'Enlace copiado',
              failure:
                'No fue posible copiar el enlace. Selecciónalo y cópialo.',
            })
          }
          variant="action"
        >
          <Link2 aria-hidden="true" /> Copiar enlace
        </Button>
        <a
          className={`${buttonVariants({ variant: 'action' })} ${ACTION_CLASS} sm:col-span-2`}
          href={qr.public_url}
          rel="noopener noreferrer"
          target="_blank"
        >
          <ExternalLink aria-hidden="true" /> Abrir página pública
        </a>
      </div>
      {/* En celular, la barra queda en fila: Cerrar a la izquierda y la acción principal al doble. */}
      <DialogFooter className="flex-row sm:justify-end">
        <DialogClose
          render={<Button className="flex-1 sm:flex-none" variant="outline" />}
        >
          Cerrar
        </DialogClose>
        <Button
          className="flex-[2] sm:flex-none"
          disabled={pending !== null}
          onClick={() => void download('png')}
        >
          <Download aria-hidden="true" />
          {pending === 'png' ? 'Descargando…' : 'Descargar PNG'}
        </Button>
      </DialogFooter>
    </>
  );
}
