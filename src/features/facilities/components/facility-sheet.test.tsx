import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildFacility } from '@/test/factories';

import { FacilitySheet } from './facility-sheet';

const occupied = buildFacility({
  name: 'M-02',
  facility_type: 'solar_dryer',
  capacity_kg: '1200.0',
  status: 'occupied',
  occupied_by: {
    lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'drying' },
    since: '2026-10-19T12:30:00Z',
  },
});

describe('FacilitySheet', () => {
  it('shows the data of a facility', () => {
    render(
      <FacilitySheet
        facility={occupied}
        farmName="F02 · La Esperanza"
        onClose={vi.fn()}
      />,
    );

    const sheet = screen.getByRole('dialog', { name: 'Marquesina M-02' });
    expect(sheet).toHaveTextContent('F02 · La Esperanza');
    expect(sheet).toHaveTextContent('1200 kg de cacao en baba');
    expect(sheet).toHaveTextContent('Ocupada');
    expect(sheet).toHaveTextContent('000123-F02-P05-261014-1');
    expect(sheet).toHaveTextContent('desde el 19 oct');
  });

  it('says when no lot occupies it', () => {
    render(
      <FacilitySheet
        facility={buildFacility({ name: 'C-01' })}
        farmName="F02 · La Esperanza"
        onClose={vi.fn()}
      />,
    );

    const sheet = screen.getByRole('dialog', { name: 'Cajón C-01' });
    expect(within(sheet).getByText('Ninguno')).toBeInTheDocument();
  });

  it('shows the actions it receives', () => {
    render(
      <FacilitySheet
        actions={<button type="button">Editar</button>}
        facility={buildFacility()}
        farmName="F02 · La Esperanza"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('closes', async () => {
    const onClose = vi.fn();
    render(
      <FacilitySheet
        facility={buildFacility()}
        farmName="F02 · La Esperanza"
        onClose={onClose}
      />,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });
});
