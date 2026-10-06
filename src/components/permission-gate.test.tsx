import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { syncActingProducer, writeActingProducer } from '@/lib/acting-producer';

import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import { PermissionGate } from './permission-gate';

function renderGate(permissions: string[]) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  renderWithProviders(
    <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD, PERMISSIONS.FARMS_CHANGE]}>
      <p>Formulario de finca</p>
    </PermissionGate>,
    { queryClient },
  );
}

describe('PermissionGate', () => {
  it('shows the screen with any of the required permissions', () => {
    renderGate([PERMISSIONS.FARMS_CHANGE]);

    expect(screen.getByText('Formulario de finca')).toBeInTheDocument();
  });

  // Un administrador sin permisos de fincas que escribe la dirección a mano.
  it('hides the screen without them', () => {
    renderGate([PERMISSIONS.PRODUCERS_VIEW, PERMISSIONS.FARMS_VIEW]);

    expect(screen.getByRole('alert')).toHaveTextContent('Acceso no disponible');
    expect(screen.queryByText('Formulario de finca')).not.toBeInTheDocument();
  });
});

describe('PermissionGate for a screen that writes under a producer', () => {
  const CHOSEN = '33333333-3333-4333-8333-333333333333';

  afterEach(() => {
    sessionStorage.clear();
    syncActingProducer(null);
  });

  function renderTechnical() {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.session(),
      buildSession({
        id: 'su1',
        producer_id: null,
        is_superuser: true,
        permissions: [PERMISSIONS.FARMS_ADD],
      }),
    );
    renderWithProviders(
      <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD]} needsProducer>
        <p>Formulario de finca</p>
      </PermissionGate>,
      { queryClient },
    );
  }

  it('asks the technical account for a producer instead of the form', () => {
    renderTechnical();

    expect(screen.getByText('Elige un productor')).toBeVisible();
    expect(screen.queryByText('Formulario de finca')).not.toBeInTheDocument();
  });

  it('shows the form once a producer is chosen', () => {
    writeActingProducer('su1', CHOSEN);
    renderTechnical();

    expect(screen.getByText('Formulario de finca')).toBeVisible();
  });

  it('does not ask a producer for one', () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      queryKeys.session(),
      buildSession({ permissions: [PERMISSIONS.FARMS_ADD] }),
    );
    renderWithProviders(
      <PermissionGate anyOf={[PERMISSIONS.FARMS_ADD]} needsProducer>
        <p>Formulario de finca</p>
      </PermissionGate>,
      { queryClient },
    );

    expect(screen.getByText('Formulario de finca')).toBeVisible();
  });
});
