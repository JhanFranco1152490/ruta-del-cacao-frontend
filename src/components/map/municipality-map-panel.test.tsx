import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { loadFakeMunicipalityMap } from '@/test/fake-map';
import { renderWithProviders } from '@/test/render';

import type { MunicipalityMapView } from './map-provider';
import { MunicipalityMapPanel } from './municipality-map-panel';

const department: MunicipalityMapView = {
  level: 'department',
  counts: [{ code: '54810', count: 3 }],
};
const municipality: MunicipalityMapView = {
  level: 'municipality',
  code: '54810',
  points: [],
};

function renderPanel(view: MunicipalityMapView) {
  const onBack = vi.fn();
  renderWithProviders(
    <MunicipalityMapPanel
      describeMunicipality={(code, count) => `${code} · ${count}`}
      label="Mapa de fincas"
      loadProvider={loadFakeMunicipalityMap}
      onBack={onBack}
      onSelectMunicipality={vi.fn()}
      onSelectPoint={vi.fn()}
      title="Tibú · 3 fincas"
      view={view}
    />,
  );
  return { onBack };
}

describe('MunicipalityMapPanel', () => {
  it('shows the municipalities without back or base layer controls', async () => {
    renderPanel(department);

    expect(
      await screen.findByRole('button', { name: '54810: 3' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Volver a municipios' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Mapa base' }),
    ).not.toBeInTheDocument();
  });

  it('goes back and switches the base layer inside a municipality', async () => {
    const user = userEvent.setup();
    const { onBack } = renderPanel(municipality);

    await user.click(
      await screen.findByRole('button', { name: 'Volver a municipios' }),
    );
    await user.click(screen.getByRole('button', { name: 'Satélite' }));

    expect(onBack).toHaveBeenCalled();
    expect(screen.getByText('Capa: satellite')).toBeInTheDocument();
  });

  it('keeps the map when only the base layer is unavailable', async () => {
    const user = userEvent.setup();
    renderPanel(municipality);

    await user.click(
      await screen.findByRole('button', { name: 'Fallar mapa base' }),
    );

    expect(screen.getByText('Municipio del mapa: 54810')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'No cargó el mapa base: se ven solo el contorno y las fincas.',
    );
  });

  it('offers to retry when the map itself fails', async () => {
    const user = userEvent.setup();
    renderPanel(department);

    await user.click(
      await screen.findByRole('button', { name: 'Fallar mapa' }),
    );

    expect(
      screen.getByText(
        'No fue posible cargar el mapa. La lista sigue disponible.',
      ),
    ).toBeInTheDocument();
  });
});
