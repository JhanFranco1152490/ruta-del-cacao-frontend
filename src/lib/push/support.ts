// Lo que el navegador permite para los avisos en el dispositivo. Son funciones puras sobre lo que
// el navegador dice de sí mismo (`pushEnvironment`), para probarlas sin un navegador de verdad.

export type PushEnvironment = {
  userAgent: string;
  maxTouchPoints: number;
  // La app abierta desde la pantalla de inicio, no desde una pestaña.
  standalone: boolean;
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
};

export type PushSupport = 'supported' | 'ios-not-installed' | 'unsupported';

export function pushEnvironment(): PushEnvironment {
  return {
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone:
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as { standalone?: boolean }).standalone === true,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
  };
}

// Un iPad se presenta como un Mac: lo delata la pantalla táctil.
const isIpad = (userAgent: string, maxTouchPoints: number) =>
  /iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
const isIos = (userAgent: string, maxTouchPoints: number) =>
  /iPhone|iPod/.test(userAgent) || isIpad(userAgent, maxTouchPoints);

// El iPhone solo recibe avisos con la app agregada a la pantalla de inicio (iOS 16.4 o posterior):
// en una pestaña de Safari se explica cómo instalarla en vez de esconder la opción.
export function pushSupport(environment: PushEnvironment): PushSupport {
  const { userAgent, maxTouchPoints, standalone } = environment;
  if (isIos(userAgent, maxTouchPoints) && !standalone) {
    return 'ios-not-installed';
  }
  return environment.serviceWorker &&
    environment.pushManager &&
    environment.notification
    ? 'supported'
    : 'unsupported';
}

// En orden: Edge y Samsung Internet también dicen "Chrome", y Chrome también dice "Safari".
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/SamsungBrowser\//, 'Samsung Internet'],
  [/Firefox\/|FxiOS\//, 'Firefox'],
  [/Chrome\/|CriOS\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];

function systemOf(userAgent: string, maxTouchPoints: number) {
  if (/Android/.test(userAgent)) return 'Android';
  if (/iPhone|iPod/.test(userAgent)) return 'iPhone';
  if (isIpad(userAgent, maxTouchPoints)) return 'iPad';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Macintosh/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux';
  return null;
}

// El nombre del dispositivo que guarda el servidor junto a la suscripción ("Chrome en Android"),
// para reconocerlo entre varios. No es un dato de la persona: solo el navegador y el sistema.
export function deviceLabel(userAgent: string, maxTouchPoints: number) {
  const browser =
    BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1] ?? 'Navegador';
  const system = systemOf(userAgent, maxTouchPoints);
  return system ? `${browser} en ${system}` : browser;
}

// La llave pública del servidor llega en base64 de URL, sin relleno; el navegador la pide en bytes.
export function vapidKeyBytes(key: string) {
  const padded = `${key}${'='.repeat((4 - (key.length % 4)) % 4)}`
    .replaceAll('-', '+')
    .replaceAll('_', '/');
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}
