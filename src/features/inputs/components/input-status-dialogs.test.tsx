import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';

import { apiError, buildAgriculturalInput } from '@/test/factories';
import { apiUrl } from '@/test/handlers';
import { server } from '@/test/server';

import {
  type InputsBackend,
  openMenuAction,
  renderInputsScreen,
  startInputsBackend,
} from './inputs-test-kit';

let backend: InputsBackend;

beforeEach(() => {
  backend = startInputsBackend([
    buildAgriculturalInput({ id: 'urea', version: 2 }),
    buildAgriculturalInput({
      id: 'sulfur',
      name: 'Azufre',
      input_type: 'fungicide',
      is_active: false,
      has_records: true,
      version: 7,
    }),
  ]);
});

const confirm = (dialog: HTMLElement, name: string) =>
  userEvent.click(within(dialog).getByRole('button', { name }));

const dialogClosed = () =>
  waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

describe('InputStatusDialog', () => {
  it('deactivates an input saying what changes and what does not', async () => {
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Desactivar');

    expect(
      within(dialog).getByText(
        'Este insumo dejará de ofrecerse en nuevas actividades y controles. Los registros que ya lo usan y sus existencias no cambian.',
      ),
    ).toBeInTheDocument();

    await confirm(dialog, 'Desactivar insumo');

    await dialogClosed();
    expect(backend.patched).toEqual([
      { id: 'urea', body: { is_active: false, expected_version: 2 } },
    ]);
    expect(await screen.findByText('Insumo desactivado')).toBeInTheDocument();
  });

  it('activates an inactive input', async () => {
    renderInputsScreen({ searchParams: '?estado=all' });
    const dialog = await openMenuAction('Azufre', 'Activar');

    await confirm(dialog, 'Activar insumo');

    await dialogClosed();
    expect(backend.patched).toEqual([
      { id: 'sulfur', body: { is_active: true, expected_version: 7 } },
    ]);
    expect(await screen.findByText('Insumo activado')).toBeInTheDocument();
  });

  it('stays open with the reason when someone changed the input first', async () => {
    server.use(
      http.patch(apiUrl('/api/agricultural-inputs/urea'), () =>
        apiError(409, 'stale_version'),
      ),
    );
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Desactivar');

    await confirm(dialog, 'Desactivar insumo');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Otra persona cambió este insumo mientras tanto.',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes without changes with Cancel', async () => {
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Desactivar');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancelar' }),
    );

    await dialogClosed();
    expect(backend.patched).toHaveLength(0);
  });
});

describe('InputDeleteDialog', () => {
  it('deletes an input created by mistake with the read version', async () => {
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Eliminar');

    expect(
      within(dialog).getByText(/Solo para insumos creados por error/),
    ).toBeInTheDocument();

    await confirm(dialog, 'Eliminar insumo');

    await dialogClosed();
    expect(backend.deleted).toEqual([{ id: 'urea', expectedVersion: '2' }]);
    expect(await screen.findByText('Insumo eliminado')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Urea 46 %')).not.toBeInTheDocument(),
    );
  });

  it('offers to deactivate when someone used the input meanwhile', async () => {
    server.use(
      http.delete(apiUrl('/api/agricultural-inputs/urea'), () =>
        apiError(409, 'input_has_records'),
      ),
    );
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Eliminar');

    await confirm(dialog, 'Eliminar insumo');

    expect(
      await within(dialog).findByText('No se puede eliminar Urea 46 %'),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Puedes desactivarlo.',
    );

    await confirm(dialog, 'Desactivar insumo');

    await dialogClosed();
    expect(backend.patched).toEqual([
      { id: 'urea', body: { is_active: false, expected_version: 2 } },
    ]);
    expect(await screen.findByText('Insumo desactivado')).toBeInTheDocument();
  });

  it('says when the input no longer exists', async () => {
    server.use(
      http.delete(apiUrl('/api/agricultural-inputs/urea'), () =>
        apiError(404, 'not_found'),
      ),
    );
    renderInputsScreen();
    const dialog = await openMenuAction('Urea 46 %', 'Eliminar');

    await confirm(dialog, 'Eliminar insumo');

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Este insumo ya no existe.',
    );
  });
});
