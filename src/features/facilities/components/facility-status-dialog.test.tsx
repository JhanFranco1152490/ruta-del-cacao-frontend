import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';

import { apiError, buildFacility } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { PostharvestFacility } from '../api';
import { FacilityStatusDialog } from './facility-status-dialog';

function renderDialog(facility: PostharvestFacility) {
  const onDone = vi.fn();
  const bodies: unknown[] = [];
  server.use(
    csrfHandler,
    http.patch(
      apiUrl(`/api/postharvest-facilities/${facility.id}`),
      async ({ request }) => {
        bodies.push(await request.json());
        return HttpResponse.json(facility);
      },
    ),
  );
  renderWithProviders(
    <FacilityStatusDialog
      facility={facility}
      onClose={vi.fn()}
      onDone={onDone}
    />,
  );
  return { onDone, bodies };
}

describe('FacilityStatusDialog', () => {
  it('deactivates an available box with the version read', async () => {
    const { onDone, bodies } = renderDialog(
      buildFacility({ id: 'c1', name: 'C-01', version: 4 }),
    );

    expect(
      screen.getByRole('dialog', { name: '¿Desactivar el cajón C-01?' }),
    ).toHaveTextContent(
      'Las fermentaciones en las que se usó no cambian. Puedes activarlo de nuevo cuando quieras.',
    );
    const confirm = screen.getByRole('button', { name: 'Desactivar' });
    // Se puede deshacer: es el botón principal, no el rojo.
    expect(confirm).toHaveClass('bg-primary');
    expect(confirm).not.toHaveClass('text-destructive');
    await userEvent.click(confirm);

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Cajón C-01 desactivado'),
    );
    expect(bodies).toEqual([{ is_active: false, expected_version: 4 }]);
  });

  it('activates an inactive dryer', async () => {
    const { onDone, bodies } = renderDialog(
      buildFacility({
        id: 'm1',
        name: 'M-01',
        facility_type: 'solar_dryer',
        is_active: false,
        status: 'inactive',
      }),
    );

    expect(
      screen.getByRole('dialog', { name: '¿Activar la marquesina M-01?' }),
    ).toHaveTextContent(
      'Quedará Disponible y se ofrecerá de nuevo al iniciar secados.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Activar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Marquesina M-01 activada'),
    );
    expect(bodies).toEqual([{ is_active: true, expected_version: 1 }]);
  });

  it('turns into the occupied notice when a lot occupied it meanwhile', async () => {
    const facility = buildFacility({ id: 'c2', name: 'C-02' });
    server.use(
      csrfHandler,
      http.patch(apiUrl('/api/postharvest-facilities/c2'), () =>
        HttpResponse.json(
          {
            detail: 'Ocupado.',
            code: 'facility_occupied',
            fields: {},
            lot: {
              id: 'l1',
              code: '000123-F02-P05-261014-1',
              status: 'fermenting',
            },
          },
          { status: 409 },
        ),
      ),
    );
    const onClose = vi.fn();
    renderWithProviders(
      <FacilityStatusDialog
        facility={facility}
        lotHref={(id) => `/lotes/detalle?id=${id}`}
        onClose={onClose}
        onDone={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    const dialog = await screen.findByRole('dialog', {
      name: '¿Desactivar el cajón C-02?',
    });
    expect(dialog).toHaveTextContent(
      'No se puede desactivar: lo ocupa el lote 000123-F02-P05-261014-1. Se podrá desactivar cuando termine su proceso.',
    );
    expect(
      within(dialog).getByRole('link', { name: 'Ver el lote' }),
    ).toHaveAttribute('href', '/lotes/detalle?id=l1');
    expect(
      within(dialog).queryByRole('button', { name: 'Desactivar' }),
    ).toBeNull();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cerrar' }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('leaves out the lot link for whoever cannot see lots', async () => {
    const facility = buildFacility({ id: 'c2', name: 'C-02' });
    server.use(
      csrfHandler,
      http.patch(apiUrl('/api/postharvest-facilities/c2'), () =>
        HttpResponse.json(
          {
            detail: 'Ocupado.',
            code: 'facility_occupied',
            fields: {},
            lot: { id: 'l1', code: 'L-1', status: 'fermenting' },
          },
          { status: 409 },
        ),
      ),
    );
    renderWithProviders(
      <FacilityStatusDialog
        facility={facility}
        onClose={vi.fn()}
        onDone={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByRole('button', { name: 'Cerrar' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ver el lote' })).toBeNull();
  });

  it('stays open with the reason when someone changed it first', async () => {
    const facility = buildFacility({ id: 'c1', name: 'C-01' });
    server.use(
      csrfHandler,
      http.patch(apiUrl('/api/postharvest-facilities/c1'), () =>
        apiError(409, 'stale_version'),
      ),
    );
    const onDone = vi.fn();
    renderWithProviders(
      <FacilityStatusDialog
        facility={facility}
        onClose={vi.fn()}
        onDone={onDone}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    expect(
      await screen.findByText(
        'Otra persona cambió este elemento mientras tanto. Cierra y vuelve a intentarlo con sus datos actuales.',
      ),
    ).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });
});
