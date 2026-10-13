import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityLegend } from './activity-legend';

describe('ActivityLegend', () => {
  it('explains the four states and the one that waits to be sent', () => {
    render(<ActivityLegend />);

    const legend = screen.getByRole('region', { name: 'Leyenda de estados' });
    const items = within(legend).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Programada'),
      expect.stringContaining('Retrasada'),
      expect.stringContaining('Vencida'),
      expect.stringContaining('Realizada'),
      expect.stringContaining('Pendiente de enviar'),
    ]);
  });

  it('says what can still be done with a delayed and an overdue activity', () => {
    render(<ActivityLegend />);

    expect(screen.getByText(/se puede reprogramar/i)).toBeInTheDocument();
    expect(
      screen.getByText(/solo registrar la realización/i),
    ).toBeInTheDocument();
  });
});
