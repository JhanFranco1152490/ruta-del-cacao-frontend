import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildProfile } from '@/test/factories';
import { profileHandler } from '@/test/handlers';
import { renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

import { AccountProfileDetails } from './account-profile-details';

describe('AccountProfileDetails', () => {
  it('muestra las fincas en las que trabaja un empleado', async () => {
    server.use(
      profileHandler(
        buildProfile({
          farms: [
            { id: 'f1', name: 'La Esperanza', is_active: true },
            { id: 'f2', name: 'Catalina', is_active: true },
          ],
        }),
      ),
    );
    renderWithProviders(<AccountProfileDetails />);

    expect(await screen.findByText('Fincas en las que trabajas')).toBeVisible();
    expect(screen.getByText('La Esperanza, Catalina')).toBeVisible();
  });

  it('no muestra fincas al productor, que no está limitado a ninguna', async () => {
    renderWithProviders(<AccountProfileDetails />);

    expect(await screen.findByText('Documento')).toBeVisible();
    expect(screen.queryByText(/en las que trabajas/)).not.toBeInTheDocument();
  });
});
