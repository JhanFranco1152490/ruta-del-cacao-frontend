import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

// Abre el menú «⋯» de una tarjeta (de la única que haya, o de la que se pase) y elige una opción.
export async function chooseFromActionsMenu(
  user: UserEvent,
  name: string,
  card?: HTMLElement,
) {
  const scope = card ? within(card) : screen;
  await user.click(
    await scope.findByRole('button', { name: /^Más acciones de/ }),
  );
  await user.click(await screen.findByRole('menuitem', { name }));
}
