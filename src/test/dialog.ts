import { screen } from '@testing-library/react';

// El diálogo abierto (modal), sin contar los avisos flotantes: el aviso de Base UI también es un
// `role="dialog"` no modal, así que `queryByRole('dialog')` lo encontraría al terminar una acción.
export const queryDialog = () =>
  screen
    .queryAllByRole('dialog')
    .find((dialog) => dialog.getAttribute('data-slot') !== 'toast') ?? null;
