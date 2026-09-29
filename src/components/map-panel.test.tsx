import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MapPanel } from './map-panel';

describe('MapPanel', () => {
  it('shows a skeleton while the map provider loads', () => {
    const { container } = render(<MapPanel isLoading location={null} />);

    expect(
      container.querySelector('[data-slot="skeleton"]'),
    ).toBeInTheDocument();
    expect(screen.getByText('Cargando mapa…')).toBeInTheDocument();
  });

  it('keeps a retry action when the map provider fails', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <MapPanel
        error="No fue posible cargar el mapa."
        location={{ latitude: '7.8234567', longitude: '-72.5123456' }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No fue posible cargar el mapa.',
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the current coordinates beside the provider content', () => {
    render(
      <MapPanel location={{ latitude: '7.8234567', longitude: '-72.5123456' }}>
        <div>Proveedor de mapa</div>
      </MapPanel>,
    );

    expect(screen.getByText('Proveedor de mapa')).toBeInTheDocument();
    expect(screen.getByText('7.8234567, -72.5123456')).toBeInTheDocument();
  });
});
