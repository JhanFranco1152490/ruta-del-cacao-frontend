import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PERMISSIONS } from '@/lib/permissions';
import { buildSessionUser } from '@/test/factories';

import { NoFarmNotice } from './no-farm-notice';

const MESSAGE = /no tiene una finca asignada/;

describe('NoFarmNotice', () => {
  it('avisa a un empleado de campo que no tiene finca', () => {
    render(
      <NoFarmNotice
        user={buildSessionUser({
          all_farms: false,
          farms: [],
          permissions: [PERMISSIONS.PLOTS_VIEW],
        })}
      />,
    );

    expect(screen.getByText(MESSAGE)).toBeVisible();
  });

  it('no avisa a quien tiene finca, al productor, al administrador ni a quien no trabaja en campo', () => {
    const cases = [
      buildSessionUser({
        all_farms: false,
        farms: [
          { id: 'f1', code: 'F01', name: 'La Esperanza', is_active: true },
        ],
        permissions: [PERMISSIONS.PLOTS_VIEW],
      }),
      buildSessionUser({ permissions: [PERMISSIONS.PLOTS_VIEW] }),
      buildSessionUser({
        all_farms: false,
        farms: [],
        permissions: [PERMISSIONS.USERS_VIEW],
      }),
      // El Administrador de la asociación lee fincas, pero no es de un productor ni lleva fincas.
      buildSessionUser({
        producer_id: null,
        all_farms: false,
        farms: [],
        permissions: [PERMISSIONS.FARMS_VIEW, PERMISSIONS.USERS_VIEW],
      }),
    ];

    for (const user of cases) {
      const { unmount } = render(<NoFarmNotice user={user} />);
      expect(screen.queryByText(MESSAGE)).not.toBeInTheDocument();
      unmount();
    }
  });
});
