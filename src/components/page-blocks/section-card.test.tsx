import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SectionCard } from './section-card';
import type { SectionPick } from './section-item';

const pick = (overrides: Partial<SectionPick> = {}): SectionPick => ({
  as: 'item',
  selected: false,
  onSelect: vi.fn(),
  stage: 'pending',
  ...overrides,
});

describe('SectionCard picked from a list', () => {
  it('shows the title, the stage and the summary as an item', () => {
    render(
      <SectionCard
        accent="cobre"
        pick={pick({ stage: 'done', summary: 'C-01 · 3 volteos' })}
        title="Fermentación"
      >
        Contenido
      </SectionCard>,
    );

    const item = screen.getByRole('button', { name: /Fermentación/ });
    expect(item).toHaveTextContent('✓ Hecha');
    expect(item).toHaveTextContent('C-01 · 3 volteos');
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('selects the section when its item is pressed', async () => {
    const onSelect = vi.fn();
    render(
      <SectionCard accent="cobre" pick={pick({ onSelect })} title="Secado">
        Contenido
      </SectionCard>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Secado/ }));

    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('marks the selected item and does nothing when it is pressed again', async () => {
    const onSelect = vi.fn();
    render(
      <SectionCard
        accent="cobre"
        pick={pick({ selected: true, stage: 'current', onSelect })}
        title="Calidad"
      >
        Contenido
      </SectionCard>,
    );

    const item = screen.getByRole('button', { name: /Calidad/ });
    expect(item).toHaveAttribute('aria-current', 'true');
    expect(item).toHaveTextContent('Actual');
    await userEvent.click(item);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows its content as a panel only when it is the selected one', () => {
    const { rerender } = render(
      <SectionCard
        accent="cobre"
        pick={pick({ as: 'panel', selected: false })}
        title="Secado"
      >
        Contenido
      </SectionCard>,
    );
    expect(screen.queryByText('Contenido')).toBeNull();

    rerender(
      <SectionCard
        accent="cobre"
        pick={pick({ as: 'panel', selected: true })}
        title="Secado"
      >
        Contenido
      </SectionCard>,
    );
    expect(screen.getByRole('region', { name: 'Secado' })).toHaveTextContent(
      'Contenido',
    );
  });

  it('is a plain card without a pick', () => {
    render(
      <SectionCard accent="cobre" title="Origen">
        Contenido
      </SectionCard>,
    );

    expect(screen.getByRole('region', { name: 'Origen' })).toHaveTextContent(
      'Contenido',
    );
  });
});
