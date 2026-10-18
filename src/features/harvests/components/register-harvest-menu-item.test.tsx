import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Menu, MenuContent, MenuTrigger } from '@/components/ui/menu';
import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildSession } from '@/test/factories';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { mockLocation, resetLocation, router } from '@/test/router';

vi.mock(
  'next/navigation',
  async () => (await import('@/test/router')).navigation,
);

import { RegisterHarvestMenuItem } from './register-harvest-menu-item';

const PLOT = { id: 'pl1', code: 'P05', isActive: true, isSynced: true };

beforeEach(() => {
  vi.clearAllMocks();
  resetLocation();
});

function renderItem(
  permissions: string[] = [PERMISSIONS.HARVESTS_ADD],
  props: Partial<React.ComponentProps<typeof RegisterHarvestMenuItem>> = {},
) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(queryKeys.session(), buildSession({ permissions }));
  renderWithProviders(
    <Menu>
      <MenuTrigger>Más acciones</MenuTrigger>
      <MenuContent>
        <RegisterHarvestMenuItem
          farm={{ isActive: true }}
          plot={PLOT}
          {...props}
        />
      </MenuContent>
    </Menu>,
    { queryClient },
  );
  return userEvent.click(screen.getByRole('button', { name: 'Más acciones' }));
}

describe('RegisterHarvestMenuItem', () => {
  it('opens the field screen with the plot chosen, coming back to where it was', async () => {
    mockLocation.path = '/fincas/detalle';
    mockLocation.search = 'id=f1';
    await renderItem();

    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Registrar cosecha en P05' }),
    );

    expect(router.push).toHaveBeenCalledWith(
      `/cosechas/registrar?parcela=pl1&origen=${encodeURIComponent('/fincas/detalle?id=f1')}`,
    );
  });

  it('is not offered without the permission, in an inactive farm or for a plot not yet on the server', async () => {
    await renderItem([]);
    await screen.findByRole('menu');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });

  it.each([
    { farm: { isActive: false } },
    { plot: { ...PLOT, isActive: false } },
    { plot: { ...PLOT, isSynced: false } },
  ])('is not offered for %o', async (props) => {
    await renderItem([PERMISSIONS.HARVESTS_ADD], props);
    await screen.findByRole('menu');
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
  });
});
