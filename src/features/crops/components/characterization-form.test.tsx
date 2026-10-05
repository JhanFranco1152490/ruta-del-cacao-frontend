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
  { id: 'ccn-51', name: 'CCN-51', isActive: true },
  { id: 'ics-95', name: 'ICS-95', isActive: true },
  { id: 'scc-61', name: 'SCC-61', isActive: false },
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

async function fillValidForm(user: User) {
  await user.selectOptions(screen.getByLabelText('Variedad 1'), 'ccn-51');
  await fillTrees(user, 0, '1800');
  await user.click(screen.getByRole('button', { name: 'Agregar variedad' }));
  await user.selectOptions(screen.getByLabelText('Variedad 2'), 'ics-95');
  await fillTrees(user, 1, '600');
  await user.selectOptions(screen.getByLabelText('Mes de siembra'), '03');
  await user.selectOptions(screen.getByLabelText('Año de siembra'), '2021');
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
        varieties: [
          { variety_id: 'ccn-51', tree_count: 1800 },
          { variety_id: 'ics-95', tree_count: 600 },
        ],
        planting_date: '2021-03',
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

    await user.click(screen.getByRole('button', { name: 'Quitar variedad 1' }));
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

  it('shows the age of the crop next to the planting month', async () => {
    const { user } = renderForm();

    await user.selectOptions(screen.getByLabelText('Mes de siembra'), '03');
    await user.selectOptions(screen.getByLabelText('Año de siembra'), '2021');

    expect(
      screen.getByText('Edad del cultivo: 5 años y 7 meses'),
    ).toBeInTheDocument();
  });

  it('marks a half-chosen planting date only after leaving both lists', async () => {
    const { user } = renderForm();

    await user.selectOptions(screen.getByLabelText('Mes de siembra'), '03');
    await user.click(screen.getByLabelText('Año de siembra'));
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
    await user.click(screen.getByRole('button', { name: 'Quitar variedad 2' }));
    expect(warnings()).not.toHaveTextContent('CCN-51');
  });

  it('keeps a deactivated variety the characterization had, marked as such', async () => {
    renderForm({
      defaultValues: {
        varieties: [{ variety_id: 'scc-61', tree_count: '900' }],
        planting_date: '2019-05',
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
    await user.click(screen.getByRole('button', { name: 'Agregar variedad' }));
    const offered = within(screen.getByLabelText('Variedad 2'))
      .getAllByRole('option')
      .map((option) => option.textContent);
    expect(offered).toContain('SCC-61 (desactivada)');
  });

  it('asks to change a deactivated variety the server characterization did not have', async () => {
    const { onSubmit, user } = renderForm({
      defaultValues: {
        varieties: [{ variety_id: 'scc-61', tree_count: '900' }],
        planting_date: '2019-05',
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
    expect(offered).toEqual(['Elige la variedad', 'CCN-51', 'ICS-95']);
  });

  it('allows up to 10 varieties', async () => {
    const { user } = renderForm();
    const add = screen.getByRole('button', { name: 'Agregar variedad' });

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
