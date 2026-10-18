import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { apiError, buildFacility } from '@/test/factories';
import { apiUrl, csrfHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import type { PostharvestFacility } from '../api';
import { FacilityDeleteDialog } from './facility-delete-dialog';

const PATH = '/api/postharvest-facilities/c4';
let deletes: URLSearchParams[];
let patches: unknown[];

beforeEach(() => {
  deletes = [];
  patches = [];
});

function renderDialog(facility: PostharvestFacility, deleted: () => Response) {
  server.use(
    csrfHandler,
    http.delete(apiUrl(PATH), ({ request }) => {
      deletes.push(new URL(request.url).searchParams);
      return deleted();
    }),
    http.patch(apiUrl(PATH), async ({ request }) => {
      patches.push(await request.json());
      return HttpResponse.json(facility);
    }),
  );
  const onDone = vi.fn();
  renderWithProviders(
    <FacilityDeleteDialog
      facility={facility}
      onClose={vi.fn()}
      onDone={onDone}
    />,
  );
  return { onDone };
}

const box = buildFacility({ id: 'c4', name: 'C-04', version: 2 });

describe('FacilityDeleteDialog', () => {
  it('deletes a facility created by mistake, with the version read', async () => {
    const { onDone } = renderDialog(
      box,
      () => new HttpResponse(null, { status: 204 }),
    );

    expect(
      screen.getByRole('dialog', { name: '¿Eliminar el cajón C-04?' }),
    ).toHaveTextContent('Esta acción no se puede deshacer.');
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Elemento eliminado'),
    );
    expect(deletes[0].get('expected_version')).toBe('2');
  });

  it('offers deactivating it when the server says it was used meanwhile', async () => {
    const { onDone } = renderDialog(box, () =>
      apiError(409, 'facility_has_records'),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByRole('dialog', {
        name: 'No se puede eliminar el cajón C-04',
      }),
    ).toHaveTextContent(
      'Alguien lo usó en un proceso mientras tanto, así que ya no se puede eliminar. Puedes desactivarlo.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }));

    await waitFor(() =>
      expect(onDone).toHaveBeenCalledWith('Cajón C-04 desactivado'),
    );
    expect(patches).toEqual([{ is_active: false, expected_version: 2 }]);
  });

  it('only explains it when the used facility is already inactive', async () => {
    renderDialog(
      buildFacility({
        id: 'c4',
        name: 'C-04',
        is_active: false,
        status: 'inactive',
      }),
      () => apiError(409, 'facility_has_records'),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));

    expect(
      await screen.findByText(
        'Alguien lo usó en un proceso mientras tanto, así que ya no se puede eliminar. Ya está inactivo.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).toBeNull();
  });
});
