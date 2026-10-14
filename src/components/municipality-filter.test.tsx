import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildMunicipalities } from '@/test/factories';
import { listedOptions, pick } from '@/test/search-select';

import { MunicipalityFilter } from './municipality-filter';

const municipalities = buildMunicipalities();

describe('MunicipalityFilter', () => {
  it('starts on every municipality, as plain text', () => {
    render(
      <MunicipalityFilter
        municipalities={municipalities}
        onChange={() => {}}
        value={null}
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'Filtrar por municipio' }),
    ).toHaveValue('Todos los municipios');
  });

  it('offers every municipality after the entry for all of them', async () => {
    render(
      <MunicipalityFilter
        municipalities={municipalities}
        onChange={() => {}}
        value={null}
      />,
    );

    expect(await listedOptions('Filtrar por municipio')).toEqual([
      'Todos los municipios',
      ...municipalities.map(({ name }) => name),
    ]);
  });

  it('gives the code of the municipality chosen, and null for all of them', async () => {
    const onChange = vi.fn();
    render(
      <MunicipalityFilter
        municipalities={municipalities}
        onChange={onChange}
        value={municipalities[0].code}
      />,
    );
    const [second] = municipalities.slice(1);

    await pick('Filtrar por municipio', second.name);
    await pick('Filtrar por municipio', 'Todos los municipios');

    expect(onChange).toHaveBeenNthCalledWith(1, second.code);
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });

  it('narrows the list as the person types', async () => {
    render(
      <MunicipalityFilter
        municipalities={municipalities}
        onChange={() => {}}
        value={null}
      />,
    );

    await userEvent.type(
      screen.getByRole('combobox', { name: 'Filtrar por municipio' }),
      municipalities[1].name.slice(0, 4).toLowerCase(),
    );

    expect(
      screen.getAllByRole('option').map((option) => option.textContent),
    ).toContain(municipalities[1].name);
  });

  it('says so when the municipality of the address is not in the catalog', () => {
    render(
      <MunicipalityFilter
        municipalities={municipalities}
        onChange={() => {}}
        value="99999"
      />,
    );

    expect(
      screen.getByRole('combobox', { name: 'Filtrar por municipio' }),
    ).toHaveValue('Municipio seleccionado');
  });
});
