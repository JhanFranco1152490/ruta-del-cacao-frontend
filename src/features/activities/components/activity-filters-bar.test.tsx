import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import { NO_ACTIVITY_FILTERS } from '../activity-filters';
import { ActivityFiltersBar } from './activity-filters-bar';

const plotOptions = [
  {
    farmId: 'f1',
    farmName: 'La Esperanza',
    plots: [
      { id: 'p1', code: 'P-01', isActive: true },
      { id: 'p2', code: 'P-02', isActive: false },
    ],
  },
  {
    farmId: 'f2',
    farmName: 'El Paraíso',
    plots: [{ id: 'p3', code: 'P-01', isActive: true }],
  },
];
const farmOptions = [
  { id: 'f2', name: 'El Paraíso' },
  { id: 'f1', name: 'La Esperanza' },
];
const assigneeOptions = [
  { id: 'u1', label: 'Ana Gómez' },
  { id: 'u2', label: 'Luis Rincón (cuenta inactiva)' },
];

function setup(props: Partial<Parameters<typeof ActivityFiltersBar>[0]> = {}) {
  const handlers = {
    onFarm: vi.fn(),
    onPlot: vi.fn(),
    onAssignee: vi.fn(),
    onToggleAssignedToMe: vi.fn(),
    onClear: vi.fn(),
  };
  renderWithProviders(
    <ActivityFiltersBar
      assigneeOptions={assigneeOptions}
      assignedToMe={false}
      farmOptions={farmOptions}
      filters={NO_ACTIVITY_FILTERS}
      hasFilters={false}
      plotOptions={plotOptions}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('ActivityFiltersBar', () => {
  it('groups the plots by farm and includes the inactive ones, marked', () => {
    setup();

    const groups = screen.getAllByRole('group');
    expect(groups.map((group) => group.getAttribute('label'))).toEqual([
      'La Esperanza',
      'El Paraíso',
    ]);
    expect(
      screen.getByRole('option', { name: 'P-02 (inactiva)' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Todas las parcelas' }),
    ).toBeInTheDocument();
  });

  it('has no state filter: the counts of the period are the filter', () => {
    setup();

    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
  });

  it('offers the farms of the period', () => {
    setup();

    expect(
      within(screen.getByLabelText('Finca'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Todas las fincas', 'El Paraíso', 'La Esperanza']);
  });

  it('shows only the plots of the farm that was chosen', () => {
    setup({
      filters: { ...NO_ACTIVITY_FILTERS, farm: 'f2' },
      hasFilters: true,
    });

    expect(
      screen.getAllByRole('group').map((group) => group.getAttribute('label')),
    ).toEqual(['El Paraíso']);
  });

  it('keeps a chosen farm that is not among the options of this period', () => {
    setup({
      filters: { ...NO_ACTIVITY_FILTERS, farm: 'gone' },
      hasFilters: true,
    });

    expect(screen.getByLabelText('Finca')).toHaveValue('gone');
    expect(
      screen.getByRole('option', {
        name: 'Finca sin actividades en este periodo',
      }),
    ).toBeInTheDocument();
  });

  it('reports each filter that changes', async () => {
    const handlers = setup();

    await userEvent.selectOptions(screen.getByLabelText('Finca'), 'f2');
    await userEvent.selectOptions(screen.getByLabelText('Parcela'), 'p3');
    await userEvent.selectOptions(screen.getByLabelText('Responsable'), 'u2');

    expect(handlers.onFarm).toHaveBeenCalledWith('f2');
    expect(handlers.onPlot).toHaveBeenCalledWith('p3');
    expect(handlers.onAssignee).toHaveBeenCalledWith('u2');
  });

  it('reports "all" as no filter', async () => {
    const handlers = setup({ filters: { ...NO_ACTIVITY_FILTERS, plot: 'p1' } });

    await userEvent.selectOptions(screen.getByLabelText('Parcela'), '');

    expect(handlers.onPlot).toHaveBeenCalledWith(null);
  });

  it('shows the filters that are set', () => {
    setup({
      filters: { farm: 'f2', plot: 'p3', state: 'delayed', assignee: 'u1' },
      hasFilters: true,
    });

    expect(screen.getByLabelText('Finca')).toHaveValue('f2');
    expect(screen.getByLabelText('Parcela')).toHaveValue('p3');
    expect(screen.getByLabelText('Responsable')).toHaveValue('u1');
  });

  it('keeps a chosen plot that is not among the options of this period', () => {
    setup({
      filters: { ...NO_ACTIVITY_FILTERS, plot: 'gone' },
      hasFilters: true,
    });

    expect(screen.getByLabelText('Parcela')).toHaveValue('gone');
    expect(
      screen.getByRole('option', {
        name: 'Parcela sin actividades en este periodo',
      }),
    ).toBeInTheDocument();
  });

  it('has the shortcut for the activities assigned to the person', async () => {
    const handlers = setup();
    const shortcut = screen.getByRole('button', { name: 'Asignadas a mí' });
    expect(shortcut).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(shortcut);

    expect(handlers.onToggleAssignedToMe).toHaveBeenCalledTimes(1);
  });

  it('marks the shortcut when it is on', () => {
    setup({ assignedToMe: true, hasFilters: true });

    expect(
      screen.getByRole('button', { name: 'Asignadas a mí' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('only offers to clear the filters when there are some', () => {
    setup();

    expect(
      screen.queryByRole('button', { name: 'Limpiar filtros' }),
    ).not.toBeInTheDocument();
  });

  it('clears the filters', async () => {
    const handlers = setup({ hasFilters: true });

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    );

    expect(handlers.onClear).toHaveBeenCalledTimes(1);
  });
});
