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

function renderPanel(
  view: MunicipalityMapView,
  extra: Partial<React.ComponentProps<typeof MunicipalityMapPanel>> = {},
) {
  const onBack = vi.fn();
  renderWithProviders(
    <MunicipalityMapPanel
      {...extra}
      controls={<button type="button">Control extra</button>}
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
  describe('with a summary beside the map', () => {
    const aside = <p>Resumen de prueba</p>;

    it('shows it, and a legend of the shades, on the department level only', async () => {
      renderPanel(department, { aside, legendLabel: 'Fincas por municipio' });

      expect(await screen.findByText('Resumen de prueba')).toBeInTheDocument();
      expect(screen.getByText('Fincas por municipio')).toBeInTheDocument();
      expect(screen.getByText('Sin fincas')).toBeInTheDocument();
      // El máximo de fincas de un municipio cierra la escala.
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('leaves the whole width to the map inside a municipality', async () => {
      renderPanel(municipality, { aside, legendLabel: 'Fincas por municipio' });

      await screen.findByRole('group', { name: 'Mapa base' });
      expect(screen.queryByText('Resumen de prueba')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Fincas por municipio'),
      ).not.toBeInTheDocument();
    });

    it('keeps the summary when the map is hidden', async () => {
      const user = userEvent.setup();
      renderPanel(department, { aside });
      await screen.findByText('Resumen de prueba');

      await user.click(screen.getByRole('button', { name: 'Ocultar mapa' }));

      expect(screen.getByText('Mapa oculto')).toBeInTheDocument();
      expect(screen.getByText('Resumen de prueba')).toBeInTheDocument();
    });
  });

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

  it('hides the base layer selector together with the map', async () => {
    const user = userEvent.setup();
    renderPanel(municipality);
    expect(
      await screen.findByRole('group', { name: 'Mapa base' }),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Ocultar mapa' }));

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
      'No cargó el mapa base: se ven solo los límites y las fincas.',
    );
  });

  it('says when the main base map failed and a backup is being used', async () => {
    const user = userEvent.setup();
    renderPanel(municipality);

    await user.click(
      await screen.findByRole('button', { name: 'Usar mapa de respaldo' }),
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Se muestra el mapa de respaldo: el principal no está disponible.',
    );
    expect(screen.getByText('Municipio del mapa: 54810')).toBeInTheDocument();
  });

  it('forgets the backup notice when the base layer is switched', async () => {
    const user = userEvent.setup();
    renderPanel(municipality);
    await user.click(
      await screen.findByRole('button', { name: 'Usar mapa de respaldo' }),
    );
    expect(screen.getByRole('status')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Satélite' }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
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

  it('offers the base layer but no way back on the free map', async () => {
    renderPanel({ level: 'free', points: [] });

    expect(await screen.findByText('Mapa libre')).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: 'Mapa base' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Volver a municipios' }),
    ).not.toBeInTheDocument();
  });

  it('places extra controls in the header, also without a base layer', async () => {
    renderPanel(department);

    const header = (await screen.findByText('Tibú · 3 fincas')).closest(
      '[data-slot="map-header"]',
    );
    expect(header).toContainElement(
      screen.getByRole('button', { name: 'Control extra' }),
    );
  });
});
