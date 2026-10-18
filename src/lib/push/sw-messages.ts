// Lo que el Service Worker hace con una push: qué muestra y a dónde lleva al tocarla. Son funciones
// sin el Service Worker, para probarlas; `app/sw.ts` solo las conecta a sus eventos.

export const PUSH_ICON = '/icons/icon-192.png';
// Sin un destino que se pueda leer, la push lleva al panel de notificaciones.
export const FALLBACK_URL = '/?notificaciones=abiertas';

const GENERIC = { title: 'Ruta del Cacao', body: 'Tienes avisos nuevos' };

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

const text = (value: unknown) =>
  typeof value === 'string' && value ? value : undefined;

// Solo una ruta de la misma app: la push no debe poder llevar a otro sitio, aunque alguien
// consiguiera mandar una.
const appPath = (value: unknown) => {
  const path = text(value);
  return path?.startsWith('/') && !path.startsWith('//') ? path : FALLBACK_URL;
};

// El título, la línea y el enlace que mandó el servidor. La etiqueta es la de la actividad: una
// push nueva de la misma reemplaza a la anterior en el teléfono, y vuelve a sonar porque es el
// recordatorio de hoy.
export function pushNotice(data: unknown) {
  const message = asRecord(data);
  const title = text(message.title);
  if (!title) {
    return {
      title: GENERIC.title,
      options: {
        body: GENERIC.body,
        icon: PUSH_ICON,
        data: { url: FALLBACK_URL },
      },
    };
  }
  const tag = text(message.tag);
  return {
    title,
    options: {
      body: text(message.body) ?? '',
      icon: PUSH_ICON,
      ...(tag && { tag, renotify: true }),
      data: { url: appPath(message.url) },
    },
  };
}

export const noticeUrl = (data: unknown) => appPath(asRecord(data).url);

type AppWindow = {
  url: string;
  focus: () => Promise<unknown>;
  navigate: (url: string) => Promise<unknown>;
};

// Al tocar la push: si la app ya está abierta en una ventana, se trae al frente y se lleva al
// enlace; si no, se abre. Una ventana que no se deja llevar (todavía no la controla este Service
// Worker) también abre una nueva.
export async function openFromNotice({
  windows,
  openWindow,
  origin,
  url,
}: {
  windows: readonly AppWindow[];
  openWindow: (url: string) => Promise<unknown>;
  origin: string;
  url: string;
}) {
  const target = new URL(url, origin).href;
  const app = windows.find((window) => new URL(window.url).origin === origin);
  if (app) {
    try {
      await app.focus();
      await app.navigate(target);
      return;
    } catch {
      // Se abre una ventana nueva.
    }
  }
  await openWindow(target);
}
