import { expect } from 'vitest';

// jsdom no calcula CSS, así que se comprueba la lista de clases: el control debe pedir el
// anillo de foco de 3 px cobre en :focus-visible y apagar el halo de la base, que si no
// competiría con él (y en estado de error lo ocultaría).
export function expectVisibleFocusOutline(element: HTMLElement) {
  expect(element).toHaveClass(
    'focus-visible:outline-3',
    'focus-visible:outline-solid',
    'focus-visible:outline-offset-2',
    'focus-visible:outline-cobre',
    'focus-visible:ring-0',
  );
}
