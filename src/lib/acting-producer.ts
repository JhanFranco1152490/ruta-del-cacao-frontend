import { isUuid } from '@/lib/validation/is-uuid';

const KEY_PREFIX = 'cacao:acting-producer:';
const listeners = new Set<() => void>();

// El productor bajo el que opera esta pestaña, ya resuelto para la cuenta de la sesión: nulo para
// quien no es superusuario aunque haya algo guardado. El cliente de la API lo lee en cada
// petición, así que se fija al resolver la sesión (antes de que ninguna consulta dependiente de
// ella salga) y no desde un efecto de React, que correría después de los de las pantallas hijas.
let current: string | null = null;

// Por pestaña y no por dispositivo: con una elección compartida, cambiar de productor en una
// pestaña dejaría a otra mostrando el nombre anterior y enviando el nuevo, y escribiría bajo un
// productor distinto al que muestra.
export function readActingProducer(userId: string): string | null {
  try {
    const value = sessionStorage.getItem(KEY_PREFIX + userId);
    return value && isUuid(value) ? value : null;
  } catch {
    return null;
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function getActingProducer() {
  return current;
}

export function writeActingProducer(userId: string, producerId: string | null) {
  try {
    if (producerId) sessionStorage.setItem(KEY_PREFIX + userId, producerId);
    else sessionStorage.removeItem(KEY_PREFIX + userId);
  } catch {
    // Sin almacenamiento la elección dura lo que dure la pantalla: no es un error de la persona.
  }
  current = producerId;
  notify();
}

export function syncActingProducer(
  user: { id: string; is_superuser?: boolean } | null,
) {
  const next = user?.is_superuser ? readActingProducer(user.id) : null;
  if (next === current) return;
  current = next;
  notify();
}

export function subscribeActingProducer(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
