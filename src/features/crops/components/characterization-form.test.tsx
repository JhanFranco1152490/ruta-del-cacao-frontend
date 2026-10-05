import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { CharacterizationFormInput } from '../schemas';
import type { VarietyOption } from '../variety-choices';
import {
  CharacterizationForm,
  emptyCharacterizationForm,
} from './characterization-form';

type User = ReturnType<typeof userEvent.setup>;

const TODAY = new Date(2026, 9, 3);

const catalog: VarietyOption[] = [
  { id: 'ccn-51', name: 'CCN-51', isActive: true, commonNames: [] },
  {
    id: 'fsa-12',
    name: 'FSA-12',
    isActive: true,
    commonNames: ['Saravena', 'Fedecacao Saravena'],
  },
  { id: 'ics-95', name: 'ICS-95', isActive: true, commonNames: [] },
  { id: 'scc-61', name: 'SCC-61', isActive: false, commonNames: [] },
];

function renderForm({
  defaultValues = emptyCharacterizationForm(),
  areaHectares = '2.40',
  blockedMessage,
  keptVarietyIds,
}: {
  defaultValues?: CharacterizationFormInput;
  areaHectares?: string;
  blockedMessage?: string;
  keptVarietyIds?: ReadonlySet<string>;
} = {}) {
  const onSubmit = vi.fn();
  render(
    <CharacterizationForm
      areaHectares={areaHectares}
      blockedMessage={blockedMessage}
      catalog={catalog}
      defaultValues={defaultValues}
      isSaving={false}
      keptVarietyIds={keptVarietyIds}
      onSubmit={onSubmit}
      today={TODAY}
    />,
  );
  return { onSubmit, user: userEvent.setup() };
}

const treeFields = () => screen.getAllByLabelText('Número de árboles');

async function fillTrees(user: User, index: number, text: string) {
  await user.clear(treeFields()[index]);
  await user.click(treeFields()[index]);
  await user.paste(text);
}

async function fillPlanting(
  user: User,
  position: number,
  variety: string,
  month: string,
  year: string,
  trees: string,
) {
  await user.selectOptions(
    screen.getByLabelText(`Variedad ${position}`),
    variety,
  );
  await user.selectOptions(
    screen.getByLabelText(`Mes de siembra ${position}`),
    month,
  );
  await user.selectOptions(
    screen.getByLabelText(`Año de siembra ${position}`),
    year,
  );
  await fillTrees(user, position - 1, trees);
}

const addPlanting = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Agregar siembra' }));

async function fillValidForm(user: User) {
  await fillPlanting(user, 1, 'ccn-51', '03', '2021', '1800');
  await addPlanting(user);
  await fillPlanting(user, 2, 'ics-95', '08', '2023', '600');
  await user.selectOptions(
    screen.getByLabelText('Etapa del ciclo productivo'),
    'full_production',
  );
}

const save = (user: User) =>
  user.click(screen.getByRole('button', { name: 'Guardar caracterización' }));

const warnings = () => screen.getByRole('status');

describe('CharacterizationForm', () => {
  it('sends the characterization as the API expects it', async () => {
    const { onSubmit, user } = renderForm();

    await fillValidForm(user);
    await user.selectOptions(
      screen.getByLabelText('Tipo de sombra (opcional)'),
      'permanent',
    );
    await save(user);

    expect(onSubmit).toHaveBeenCalledWith(
      {
        plantings: [
          { variety_id: 'ccn-51', planting_date: '2021-03', tree_count: 1800 },
          { variety_id: 'ics-95', planting_date: '2023-08', tree_count: 600 },
        ],
        stage: 'full_production',
        management_system: null,
        shade_type: 'permanent',
      },
      expect.anything(),
    );
  });

  it('stops without a variety and marks the field', async () => {
    const { onSubmit, user } = renderForm();

    await save(user);

    expect(screen.getByLabelText('Variedad 1')).toHaveAccessibleDescription(
      'Seleccione la variedad de cacao',
    );
    expect(
      screen.getByText('Selecciona la etapa del ciclo productivo.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for a variety when every line was removed', async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole('button', { name: 'Quitar siembra 1' }));
    await save(user);

    expect(
      screen.getByText('Seleccione la variedad de cacao'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the total of trees and the density while typing', async () => {
    const { user } = renderForm();

    await fillValidForm(user);

    expect(screen.getByText('2.400')).toBeInTheDocument();
    expect(screen.getByText('1.000 árboles/ha')).toBeInTheDocument();
  });

  it('shows the average age of the crop, weighed by the trees of each planting', async () => {
    const { user } = renderForm();

    // 1.000 árboles de 2018-10 (8 años) y 500 de 2024-10 (2 años): 6 años.
    await fillPlanting(user, 1, 'ccn-51', '10', '2018', '1000');
    await addPlanting(user);
    await fillPlanting(user, 2, 'ccn-51', '10', '2024', '500');

    expect(screen.getByText('6 años')).toBeInTheDocument();
  });

  it('accepts the same variety planted on another date, but not on the same one', async () => {
    const { onSubmit, user } = renderForm();

    await fillPlanting(user, 1, 'ccn-51', '10', '2018', '1000');
    await addPlanting(user);
    await fillPlanting(user, 2, 'ccn-51', '10', '2018', '500');
    await user.selectOptions(
      screen.getByLabelText('Etapa del ciclo productivo'),
      'full_production',
    );
    await save(user);
    expect(screen.getByLabelText('Variedad 2')).toHaveAccessibleDescription(
      'Esta siembra ya está en la lista',
    );
    expect(onSubmit).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText('Año de siembra 2'), '2024');
    await save(user);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('does not let an impossible density be saved', async () => {
    const { onSubmit, user } = renderForm({ areaHectares: '1.00' });

    await fillPlanting(user, 1, 'ccn-51', '03', '2021', '11000');
    await user.selectOptions(
      screen.getByLabelText('Etapa del ciclo productivo'),
      'full_production',
    );
    await save(user);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Con 11.000 árboles/ha la densidad no es posible: el máximo es 10.000.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows each variety with the common name producers recognize', () => {
    renderForm();

    expect(
      within(screen.getByLabelText('Variedad 1')).getByRole('option', {
        name: 'FSA-12 · Saravena',
      }),
    ).toBeInTheDocument();
  });

  it('marks a half-chosen planting date only after leaving both lists', async () => {
    const { user } = renderForm();

    await user.selectOptions(screen.getByLabelText('Mes de siembra 1'), '03');
    await user.click(screen.getByLabelText('Año de siembra 1'));
    expect(
      screen.queryByText('Ingresa el mes y el año de siembra.'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Etapa del ciclo productivo'));
    expect(
      screen.getByText('Ingresa el mes y el año de siembra.'),
    ).toBeInTheDocument();
  });

  it('warns about an unusual density without blocking the save', async () => {
    const { onSubmit, user } = renderForm({ areaHectares: '2.00' });

    await fillValidForm(user);
    await fillTrees(user, 0, '4400');

    expect(warnings()).toHaveTextContent(
      'Densidad de siembra fuera de rango habitual (2.500 árboles/ha).',
    );
    await save(user);
    expect(onSubmit).toHaveBeenCalled();
  });

  it('recommends keeping CCN-51 apart from other clones', async () => {
    const { user } = renderForm();

    await fillValidForm(user);

    expect(warnings()).toHaveTextContent(
      'Se recomienda sembrar CCN-51 en parcelas separadas de otros clones.',
    );
    await user.click(screen.getByRole('button', { name: 'Quitar siembra 2' }));
    expect(warnings()).not.toHaveTextContent('CCN-51');
  });

  it('keeps a deactivated variety the characterization had, marked as such', async () => {
    renderForm({
      defaultValues: {
        plantings: [
          { variety_id: 'scc-61', planting_date: '2019-05', tree_count: '900' },
        ],
        stage: 'full_production',
        management_system: '',
        shade_type: '',
      },
      keptVarietyIds: new Set(['scc-61']),
    });

    const kept = screen.getByLabelText('Variedad 1');
    expect(kept).toHaveValue('scc-61');
    expect(kept).toHaveAccessibleDescription(
      'Variedad desactivada: ya no se ofrece para fichas nuevas. Puedes conservarla o cambiarla.',
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Agregar siembra' }));
    const offered = within(screen.getByLabelText('Variedad 2'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offered).toContain('SCC-61 (desactivada)');
  });

  it('asks to change a deactivated variety the server characterization did not have', async () => {
    const { onSubmit, user } = renderForm({
      defaultValues: {
        plantings: [
          { variety_id: 'scc-61', planting_date: '2019-05', tree_count: '900' },
        ],
        stage: 'full_production',
        management_system: '',
        shade_type: '',
      },
    });

    const line = screen.getByLabelText('Variedad 1');
    expect(line).toHaveAccessibleDescription(
      'Esta variedad ya no está disponible. Elige otra del catálogo.',
    );
    await save(user);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.selectOptions(line, 'ccn-51');
    await save(user);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('does not offer a deactivated variety on a new characterization', () => {
    renderForm();

    const offered = within(screen.getByLabelText('Variedad 1'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offered).toEqual([
      'Elige la variedad',
      'CCN-51',
      'FSA-12 · Saravena',
      'ICS-95',
    ]);
  });

  it('allows up to 10 plantings', async () => {
    const { user } = renderForm();
    const add = screen.getByRole('button', { name: 'Agregar siembra' });

    for (let line = 1; line < 10; line += 1) await user.click(add);

    expect(treeFields()).toHaveLength(10);
    expect(add).toBeDisabled();
  });

  it('explains why it cannot save', () => {
    renderForm({ blockedMessage: 'La parcela está inactiva.' });

    expect(
      screen.getByRole('button', { name: 'Guardar caracterización' }),
    ).toBeDisabled();
    expect(screen.getByText('La parcela está inactiva.')).toBeInTheDocument();
  });
});
