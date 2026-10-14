import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Elige una opción de un `SearchSelect`: lo abre y espera a que llegue la opción, porque casi
// todas vienen del servidor simulado y con la máquina ocupada tardan más que el segundo por defecto.
// `container` acota dónde se busca el campo cuando la pantalla tiene otro con el mismo nombre (un
// diálogo sobre una pantalla con filtros); la lista de opciones sale en un portal, fuera de él.
export async function pick(
  label: string,
  option: string,
  container?: HTMLElement,
) {
  const scope = container ? within(container) : screen;
  await userEvent.click(scope.getByRole('combobox', { name: label }));
  await userEvent.click(
    await screen.findByRole('option', { name: option }, { timeout: 5000 }),
  );
}

// Los nombres de las opciones que ofrece un `SearchSelect`, en el orden en que salen. Lo abre y lo
// vuelve a cerrar.
export async function listedOptions(label: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }));
  await screen.findAllByRole('option', undefined, { timeout: 5000 });
  const names = screen
    .getAllByRole('option')
    .map((option) => option.textContent);
  await userEvent.keyboard('{Escape}');
  return names;
}
