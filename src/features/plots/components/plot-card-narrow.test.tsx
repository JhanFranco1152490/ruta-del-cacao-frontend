import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MenuItem } from '@/components/ui/menu';
import { queryKeys } from '@/lib/api/query-keys';
import { PERMISSIONS } from '@/lib/permissions';
import { buildPlot, buildSession, buildVertex } from '@/test/factories';
import { plotsHandler } from '@/test/handlers';
import { createTestQueryClient, renderWithProviders } from '@/test/render';
import { server } from '@/test/server';

vi.mock('@/config/map', async () => {
  const { loadFakePointsMap } = await import('@/test/fake-map');
  return { loadPointsMapProvider: loadFakePointsMap };
});

// Una tarjeta angosta: lo que no cabe junto al código, el área y el estado pasa al menú «⋯».
vi.mock('@/hooks/use-narrow-container', async () => {
  const { createRef } = await import('react');
  return { useNarrowContainer: () => [createRef(), true] as const };
});

import { FarmPlotsSection } from './farm-plots-section';

const FARM = {
  id: 'f1',
  name: 'La Esperanza',
  areaHectares: '10.00',
  location: { latitude: '7.8234567', longitude: '-72.5123456' },
  isActive: true,
};

const BOUNDARY = [
  buildVertex('-72.5000000', '7.8000000'),
  buildVertex('-72.4990000', '7.8000000'),
  buildVertex('-72.4990000', '7.8010000'),
];

let userId: string;
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  userId = `plot-narrow-${crypto.randomUUID()}`;
});

function renderSection(onExtra = vi.fn()) {
  const queryClient = createTestQueryClient();
  queryClient.setQueryData(
    queryKeys.session(),
    buildSession({
      id: userId,
      permissions: [
        PERMISSIONS.FARMS_VIEW,
        PERMISSIONS.PLOTS_VIEW,
        PERMISSIONS.PLOTS_CHANGE,
      ],
    }),
  );
  return renderWithProviders(
    <FarmPlotsSection
      farm={FARM}
      renderPlotMenuItems={() => (
        <MenuItem onClick={onExtra}>Opción de otro dominio</MenuItem>
      )}
      renderPlotShortcuts={() => <button type="button">Atajo suelto</button>}
    />,
    { queryClient },
  );
}

describe('a narrow plot card', () => {
  it('leaves only the «⋯» button and moves the rest into its menu', async () => {
    const user = userEvent.setup();
    const onExtra = vi.fn();
    server.use(plotsHandler([buildPlot({ id: 'a', boundary: BOUNDARY })]));
    renderSection(onExtra);

    await user.click(
      await screen.findByRole('button', { name: 'Más acciones de P01' }),
    );

    expect(
      screen.queryByRole('button', { name: 'Ver P01 en el mapa' }),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByRole('menuitem', { name: 'Ver en el mapa' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Editar' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('menuitem', { name: 'Opción de otro dominio' }),
    );
    expect(onExtra).toHaveBeenCalledOnce();
  });

  it('shows the plot on the map from the menu', async () => {
    const user = userEvent.setup();
    server.use(plotsHandler([buildPlot({ id: 'a', boundary: BOUNDARY })]));
    renderSection();

    await user.click(
      await screen.findByRole('button', { name: 'Más acciones de P01' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Ver en el mapa' }),
    );

    expect(await screen.findByText('Enfocado: a')).toBeInTheDocument();
  });
});
