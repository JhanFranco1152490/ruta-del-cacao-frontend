import { useState } from 'react';

import { saveFile } from '@/lib/files/save-file';
import { notify } from '@/lib/notify';

import { qrFileName, qrPngBlob, qrSvgText } from './qr-files';

export type QrDownloadKind = 'png' | 'svg';

// El dibujo se hace en el navegador, así que un código ya dibujado se descarga también sin conexión.
export function useQrDownload(lotCode: string, address: string) {
  const [pending, setPending] = useState<QrDownloadKind | null>(null);

  async function download(kind: QrDownloadKind) {
    setPending(kind);
    try {
      const blob =
        kind === 'png'
          ? await qrPngBlob(address)
          : new Blob([await qrSvgText(address)], { type: 'image/svg+xml' });
      saveFile(blob, qrFileName(lotCode, kind));
    } catch {
      notify.error('No fue posible descargar el código. Inténtalo de nuevo.');
    } finally {
      setPending(null);
    }
  }

  return { pending, download };
}
