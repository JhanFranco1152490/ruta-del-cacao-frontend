import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { ActivityDayDialog } from './activity-day-dialog';

const TODAY = '2026-10-22';

const items = ['a', 'b', 'c'].map((id, index) =>
  toActivityOfDay(
    buildAgriculturalActivity({
      id,
      scheduled_date: '2026-10-13',
      activity_type: (['pruning', 'irrigation', 'fertilization'] as const)[
        index
      ],
    }),
    TODAY,
  ),
);

describe('ActivityDayDialog', () => {
  it('names the day and counts its activities', () => {
    render(
      <ActivityDayDialog
        date="2026-10-13"
        items={items}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'martes 13 de octubre' });
    expect(within(dialog).getByText('3 actividades')).toBeInTheDocument();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
  });

  it('counts a single activity in the singular', () => {
    render(
      <ActivityDayDialog
        date="2026-10-13"
        items={items.slice(0, 1)}
        onClose={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText('1 actividad')).toBeInTheDocument();
  });

  it('opens the detail of the one that is touched', async () => {
    const onSelect = vi.fn();
    render(
      <ActivityDayDialog
        date="2026-10-13"
        items={items}
        onClose={vi.fn()}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Riego/ }));

    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it('closes', async () => {
    const onClose = vi.fn();
    render(
      <ActivityDayDialog
        date="2026-10-13"
        items={items}
        onClose={onClose}
        onSelect={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalled();
  });
});
