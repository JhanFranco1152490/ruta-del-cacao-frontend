import { apiFetchBlob } from '@/lib/api/client';

// Cuánto vive el enlace del archivo después de abrirlo: lo suficiente para que la pestaña lo cargue.
const URL_LIFETIME_MS = 60_000;

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
    const url = URL.createObjectURL(blob);
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), URL_LIFETIME_MS);
  } catch (error) {
    tab?.close();
    throw error;
  }
}
