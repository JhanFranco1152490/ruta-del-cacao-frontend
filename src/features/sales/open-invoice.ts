import { apiFetchBlob } from '@/lib/api/client';
import { saveFile, temporaryObjectUrl } from '@/lib/files/save-file';

// Abre el soporte de una venta en otra pestaña. La sesión viaja en una cookie hacia el servidor de la
// API, así que no basta con un enlace: se descarga y se abre desde el dispositivo. La pestaña se abre
// antes de esperar la descarga, mientras el toque todavía cuenta como del usuario; si el navegador la
// bloquea igual, el archivo se descarga con su nombre.
export async function openInvoice(saleId: string, fileName: string) {
  const tab = window.open('', '_blank');
  try {
    const blob = await apiFetchBlob(
      `/api/sales/${encodeURIComponent(saleId)}/invoice`,
    );
    if (tab) {
      tab.location.href = temporaryObjectUrl(blob);
    } else {
      saveFile(blob, fileName);
    }
  } catch (error) {
    tab?.close();
    throw error;
  }
}
