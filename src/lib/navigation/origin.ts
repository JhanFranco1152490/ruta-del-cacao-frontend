import { NAV_ITEMS, navItemForPath } from '@/config/navigation';

// El parámetro de la dirección con la pantalla desde la que se abrió un editor. La dirección va en
// español como el resto (`?buscar=`, `?vista=`).
export const ORIGIN_PARAM = 'origen';

const MAX_LENGTH = 2000;
// Una dirección que no se usa para resolver nada: solo sirve para separar la ruta y los
// parámetros de lo que llegó, y comprobar que no se sale de la app.
const BASE = 'http://origen.invalid';
const CONTROL_OR_BACKSLASH = /[\u0000-\u001f\u007f\\]/;

// Si `value` es una ruta de esta app a la que se puede volver. El parámetro lo puede escribir
// cualquiera, así que solo se acepta lo que no puede llevar fuera ni a otro sitio:
// - empieza con una sola `/` (no `//otro.sitio`) y no lleva barra invertida ni caracteres de
//   control;
// - interpretada, sigue siendo de este origen (descarta `/\otro`, `/%2F%2Fotro` y esquemas);
// - su primer tramo es una sección registrada en el menú.
export function isInternalPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.length > MAX_LENGTH) return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (CONTROL_OR_BACKSLASH.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value, BASE);
  } catch {
    return false;
  }
  if (url.origin !== BASE) return false;
  return navItemForPath(NAV_ITEMS, url.pathname) !== undefined;
}

type Params = { get(name: string): string | null } | null | undefined;

// La pantalla a la que volver según los parámetros de la dirección, o `null` si no hay o no es
// válida: entonces se va al destino de siempre de esa pantalla.
export function readOrigin(params: Params): string | null {
  const value = params?.get(ORIGIN_PARAM) ?? null;
  return isInternalPath(value) ? value : null;
}

// La dirección de un editor con la pantalla actual recordada, para el enlace que lo abre. Si la
// pantalla actual ya es un editor con su propio origen, ese no se arrastra: si no, las
// direcciones crecerían con cada paso. Si la pantalla actual no es válida, el enlace queda igual.
export function withOrigin(href: string, current: string): string {
  if (!isInternalPath(current)) return href;
  const origin = new URL(current, BASE);
  origin.searchParams.delete(ORIGIN_PARAM);
  const target = new URL(href, BASE);
  target.searchParams.set(ORIGIN_PARAM, `${origin.pathname}${origin.search}`);
  return `${target.pathname}${target.search}${target.hash}`;
}
