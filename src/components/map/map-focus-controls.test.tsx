import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MapFocusTarget } from './map-provider';
import { MapFocusControls } from './map-focus-controls';

// Como lo usa un panel de mapa: el padre guarda a dónde ir en su propio estado, de modo que
// llamar a `onFocus` mientras se dibuja el hijo actualiza a otro componente en pleno dibujo.
function Panel({
  hasGps,
  onRequestGps,
  onTarget,
}: {
  hasGps: boolean;
  onRequestGps?: () => void;
  onTarget: (target: MapFocusTarget) => void;
}) {
  const [, setFocus] = useState<MapFocusTarget>();
  return (
    <MapFocusControls
      canGoToFarm
      farmLabel="Ir a la finca"
      hasGps={hasGps}
      onFocus={(target) => {
        setFocus(target);
        onTarget(target);
      }}
      onRequestGps={onRequestGps}
    />
  );
}

afterEach(() => vi.restoreAllMocks());

describe('MapFocusControls', () => {
  it('goes to the position once the first reading arrives, without updating the panel while drawing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const onTarget = vi.fn();
    const onRequestGps = vi.fn();
    const { rerender } = render(
      <Panel hasGps={false} onRequestGps={onRequestGps} onTarget={onTarget} />,
    );

    await user.click(screen.getByRole('button', { name: 'Ir a mi ubicación' }));
    expect(onRequestGps).toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Buscando tu ubicación…' }),
    ).toBeInTheDocument();
    expect(onTarget).not.toHaveBeenCalled();

    rerender(<Panel hasGps onRequestGps={onRequestGps} onTarget={onTarget} />);

    expect(onTarget).toHaveBeenCalledExactlyOnceWith('gps');
    expect(
      screen.getByRole('button', { name: 'Ir a mi ubicación' }),
    ).toBeInTheDocument();
    expect(error).not.toHaveBeenCalled();
  });

  it('does not jump to the position again when the GPS is turned off and on later', async () => {
    const user = userEvent.setup();
    const onTarget = vi.fn();
    const { rerender } = render(
      <Panel hasGps={false} onRequestGps={vi.fn()} onTarget={onTarget} />,
    );
    await user.click(screen.getByRole('button', { name: 'Ir a mi ubicación' }));
    rerender(<Panel hasGps onRequestGps={vi.fn()} onTarget={onTarget} />);
    onTarget.mockClear();

    rerender(
      <Panel hasGps={false} onRequestGps={vi.fn()} onTarget={onTarget} />,
    );
    rerender(<Panel hasGps onRequestGps={vi.fn()} onTarget={onTarget} />);

    expect(onTarget).not.toHaveBeenCalled();
  });

  it('goes to the position at once when the GPS is already on', async () => {
    const user = userEvent.setup();
    const onTarget = vi.fn();
    render(<Panel hasGps onTarget={onTarget} />);

    await user.click(screen.getByRole('button', { name: 'Ir a mi ubicación' }));

    expect(onTarget).toHaveBeenCalledExactlyOnceWith('gps');
  });
});
