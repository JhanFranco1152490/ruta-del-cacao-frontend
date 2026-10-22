'use client';

import { type RefObject, useEffect, useRef } from 'react';

// Los modales abiertos que le pidieron al navegador una entrada de historial, del más viejo al más
// nuevo. Atrás cierra solo el de arriba.
const stack: symbol[] = [];
// Cuántos «atrás» los hizo la propia app para devolver una entrada: no son del usuario.
let ownBacks = 0;
// Si el «atrás» que se está atendiendo es uno de los propios. Un solo oyente lo decide para todos los
// modales, aunque ninguno esté abierto cuando llega.
let ignoringPop = false;
let installed = false;

function installOwnBackListener() {
  if (installed) return;
  installed = true;
  window.addEventListener('popstate', () => {
    ignoringPop = ownBacks > 0;
    if (ignoringPop) ownBacks -= 1;
  });
}
// Cuánto se espera para devolver la entrada de un modal que se cerró por su cuenta (no porque la
// persona lo descartó): lo más común es un enlace del modal que cambia de pantalla, y la navegación
// tarda en confirmarse.
const NAVIGATION_GRACE_MS = 900;

// En el celular, «atrás» cierra el modal abierto en vez de salir de la pantalla. Al abrirse agrega
// una entrada al historial con la misma dirección, marcada en su estado; atrás la quita y cierra el
// modal, y si el modal se cierra de otra forma esa entrada se devuelve: de inmediato si la persona
// lo descartó (la X, tocar fuera, Escape) y, si lo cerró el código (un enlace que navega, guardar),
// tras un momento y solo si la entrada sigue siendo la actual: una navegación ya dejó otra encima y
// no se toca. Un modal que se abre con la dirección y ya trae su propia entrada (`?cuenta=nueva`,
// con `history: 'push'`) no lo usa (`closeOnBack={false}` en su `Dialog`).
export function useBackToClose(
  open: boolean,
  close: () => void,
  dismissedByUser: RefObject<boolean>,
) {
  const closeRef = useRef(close);

  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    installOwnBackListener();
    const id = Symbol('modal');
    const marker = crypto.randomUUID();
    stack.push(id);
    // Se conserva el estado actual: el enrutador de Next lo necesita para reconocer la entrada.
    window.history.pushState(
      { ...window.history.state, __modalEntry: marker },
      '',
      window.location.href,
    );
    let poppedByBack = false;

    const onPop = () => {
      if (ignoringPop) return;
      if (stack[stack.length - 1] !== id) return;
      poppedByBack = true;
      stack.pop();
      closeRef.current();
    };
    window.addEventListener('popstate', onPop);

    return () => {
      window.removeEventListener('popstate', onPop);
      if (poppedByBack) return;
      const index = stack.indexOf(id);
      if (index !== -1) stack.splice(index, 1);
      const giveBack = () => {
        if (window.history.state?.__modalEntry !== marker) return;
        ownBacks += 1;
        window.history.back();
      };
      const wasDismissed = dismissedByUser.current;
      dismissedByUser.current = false;
      setTimeout(giveBack, wasDismissed ? 0 : NAVIGATION_GRACE_MS);
    };
  }, [open, dismissedByUser]);
}
