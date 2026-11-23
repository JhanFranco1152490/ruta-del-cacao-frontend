import type { QRCodeToDataURLOptions } from 'qrcode';

// Nivel de corrección Q (recupera hasta el 25 % de un código dañado): el QR va en un saco que se
// ensucia y se arruga. El margen de 4 módulos es el que pide el estándar para que se lea.
const QR_OPTIONS = { errorCorrectionLevel: 'Q', margin: 4 } as const;

// Para imprimir en una etiqueta o en un saco.
const PNG_SIZE = 1024;

// La librería pesa ~30 KB y solo se usa al abrir el diálogo del código: se carga entonces.
const loadQrCode = () => import('qrcode');

export const qrFileName = (lotCode: string, extension: 'png' | 'svg') =>
  `qr-${lotCode}.${extension}`;

export async function qrSvgText(address: string): Promise<string> {
  const QRCode = await loadQrCode();
  return QRCode.toString(address, { ...QR_OPTIONS, type: 'svg' });
}

// El dibujo vectorial como dirección que una imagen puede cargar: así se muestra sin inyectar
// marcado en la página.
export const qrSvgDataUrl = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('La dirección no es una imagen en base64.');
  const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: match[1] });
}

export async function qrPngBlob(address: string): Promise<Blob> {
  const QRCode = await loadQrCode();
  const options: QRCodeToDataURLOptions = {
    ...QR_OPTIONS,
    type: 'image/png',
    width: PNG_SIZE,
  };
  return dataUrlToBlob(await QRCode.toDataURL(address, options));
}
