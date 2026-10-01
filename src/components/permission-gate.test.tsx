import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
