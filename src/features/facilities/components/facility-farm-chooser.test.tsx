import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { FarmOption } from '@/lib/api/farm-options';
import { buildFacility } from '@/test/factories';

import { FacilityFarmChooser } from './facility-farm-chooser';

const option = (overrides: Partial<FarmOption>): FarmOption => ({
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  isActive: true,
  municipality: 'Cúcuta',
  producer: {
    id: 'p1',
    member_code: 'PROD-000007',
    first_name: 'Ana',
    last_name: 'Prueba',
  },
  ...overrides,
});

const farms = [
  option({ id: 'f1', code: 'F01', name: 'La Esperanza' }),
  option({ id: 'f2', code: 'F02', name: 'El Diviso', municipality: 'Tibú' }),
];

const esperanza = {
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};

describe('FacilityFarmChooser', () => {
  it('asks which farm, with a card per farm and what it has', () => {
    render(
      <FacilityFarmChooser
        facilities={[
          buildFacility({ id: 'a', farm: esperanza }),
          buildFacility({
            id: 'b',
            farm: esperanza,
            facility_type: 'solar_dryer',
          }),
        ]}
        farms={farms}
        onChoose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: '¿De qué finca quieres ver los cajones y marquesinas?',
      }),
    ).toBeInTheDocument();
    const esperanzaCard = screen.getByRole('button', {
      name: /F01 · La Esperanza/,
    });
    expect(esperanzaCard).toHaveTextContent('1 cajón · 1 marquesina');
    expect(esperanzaCard).toHaveTextContent('Cúcuta');
    expect(
      screen.getByRole('button', { name: /F02 · El Diviso/ }),
    ).toHaveTextContent('Sin cajones ni marquesinas');
  });

  it('chooses the farm touched', async () => {
    const onChoose = vi.fn();
    render(
      <FacilityFarmChooser facilities={[]} farms={farms} onChoose={onChoose} />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /F02 · El Diviso/ }),
    );

    expect(onChoose).toHaveBeenCalledWith('f2');
  });

  it('leaves out what each farm has while the facilities have not loaded', () => {
    render(
      <FacilityFarmChooser
        facilities={undefined}
        farms={farms}
        onChoose={vi.fn()}
      />,
    );

    expect(
      screen.queryByText('Sin cajones ni marquesinas'),
    ).not.toBeInTheDocument();
  });
});
