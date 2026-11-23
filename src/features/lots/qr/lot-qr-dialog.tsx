'use client';

import { useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { notify } from '@/lib/notify';

import { type Lot, type LotQr, useGenerateLotQr } from '../api';
import { LotQrGenerate } from './lot-qr-generate';
import { LotQrView } from './lot-qr-view';
import { generateQrErrorMessage, isQrAlreadyGenerated } from './qr-errors';

// El diálogo del código QR de un lote: si ya tiene uno, lo muestra; si no, ofrece generarlo. Un
// código recién generado se muestra en el acto, sin esperar a que la ficha se vuelva a leer.
export function LotQrDialog({
  lot,
  onClose,
}: {
  lot: Lot;
  onClose: () => void;
}) {
  const generate = useGenerateLotQr(lot.id);
  const [created, setCreated] = useState<LotQr | null>(null);
  const [error, setError] = useState<string>();
  const qr = lot.qr ?? created;

  async function onGenerate() {
    setError(undefined);
    try {
      setCreated(await generate.mutateAsync());
      notify.success('Código QR generado');
    } catch (failure) {
      if (isQrAlreadyGenerated(failure)) {
        // Otra persona lo generó primero: la ficha se vuelve a leer y mostrará ese código.
        notify.info('Este lote ya tiene un código QR.');
        return;
      }
      setError(generateQrErrorMessage(failure));
    }
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && !generate.isPending) onClose();
      }}
      open
    >
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!generate.isPending}
      >
        {qr ? (
          <LotQrView lot={lot} qr={qr} />
        ) : (
          <LotQrGenerate
            error={error}
            isSaving={generate.isPending}
            onGenerate={() => void onGenerate()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
