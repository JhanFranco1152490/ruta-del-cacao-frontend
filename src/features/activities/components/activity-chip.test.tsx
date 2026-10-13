import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from '../activity-days';
import { ActivityChip } from './activity-chip';

const TODAY = '2026-10-22';

const itemOf = (
  overrides: Parameters<typeof buildAgriculturalActivity>[0] = {},
  completion?: 'pending' | 'error',
) =>
  toActivityOfDay(
    buildAgriculturalActivity({ id: 'x', ...overrides }),
    TODAY,
    completion ? new Map([['x', completion]]) : undefined,
  );

describe('ActivityChip', () => {
  it('says the labor, the plot and the state in text', () => {
    render(
      <ActivityChip
        item={itemOf({ scheduled_date: '2026-10-25' })}
        onSelect={vi.fn()}
      />,
    );

    const chip = screen.getByRole('button');
    expect(chip).toHaveTextContent('P-03');
    expect(chip).toHaveTextContent('Fertilización');
    expect(chip).toHaveTextContent('Programada');
  });

  it('names everything in its accessible name', () => {
    render(
      <ActivityChip
        item={itemOf({ scheduled_date: '2026-10-20' })}
        onSelect={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: 'Fertilización, parcela P-03, martes 20 de octubre, Retrasada · 2 días',
      }),
    ).toBeInTheDocument();
  });

  it.each([
    ['2026-10-25', undefined, 'Programada'],
    ['2026-10-21', undefined, 'Retrasada · 1 día'],
    ['2026-10-10', undefined, 'Vencida · 12 días'],
    ['2026-10-25', 'pending', 'Realizada · pendiente de enviar'],
  ] as const)('shows the state of %s %s as %s', (date, completion, text) => {
    render(
      <ActivityChip
        item={itemOf({ scheduled_date: date }, completion)}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toHaveTextContent(text);
  });

  it('shows a done activity as done', () => {
    render(
      <ActivityChip
        item={itemOf({
          scheduled_date: '2026-10-05',
          status: 'done',
          state: 'done',
          done_date: '2026-10-05',
        })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Realizada');
  });

  it('names an Other labor by what the person wrote', () => {
    render(
      <ActivityChip
        item={itemOf({
          activity_type: 'other',
          other_description: 'Reparar el cerco',
        })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole('button')).toHaveTextContent('Reparar el cerco');
  });

  it('dashes the border of a completion that waits to be sent', () => {
    render(<ActivityChip item={itemOf({}, 'pending')} onSelect={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveClass('border-dashed');
  });

  it('opens the detail when touched', async () => {
    const onSelect = vi.fn();
    render(<ActivityChip item={itemOf()} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button'));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
