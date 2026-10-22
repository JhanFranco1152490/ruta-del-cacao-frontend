import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PestSummary } from '../history-api';
import { PestSummaryCards } from './pest-summary-cards';

const row = (overrides: Partial<PestSummary> = {}): PestSummary => ({
  pest_disease: {
    id: 'monilia',
    name: 'Monilia',
    kind: 'disease',
    is_active: true,
  },
  other_description: null,
  sampling_unit: 'trees',
  latest_incidence: '24.00',
  previous_incidence: '31.00',
  latest_date: '2026-10-19',
  ...overrides,
});

const card = (name: string) =>
  screen.getByText(name).closest('li') as HTMLElement;

describe('PestSummaryCards', () => {
  it('shows the last incidence and says whether it goes down or up', () => {
    render(
      <PestSummaryCards
        summary={[
          row(),
          row({
            pest_disease: null,
            other_description: 'Hormigas en hojas',
            latest_incidence: '30.00',
            previous_incidence: '10.00',
          }),
        ]}
      />,
    );

    const monilia = card('Monilia');
    expect(monilia).toHaveTextContent('24 %');
    expect(monilia).toHaveTextContent('de árboles');
    expect(within(monilia).getByText(/Baja 7 puntos/)).toBeInTheDocument();
    expect(
      within(card('Otra (Hormigas en hojas)')).getByText(/Sube 20 puntos/),
    ).toBeInTheDocument();
  });

  it('says it is the first record when there is nothing to compare with', () => {
    render(
      <PestSummaryCards
        summary={[row({ sampling_unit: 'pods', previous_incidence: null })]}
      />,
    );

    expect(screen.getByText('Primer registro')).toBeInTheDocument();
    expect(card('Monilia')).toHaveTextContent('de mazorcas');
  });

  it('shows nothing without a summary', () => {
    const { container } = render(<PestSummaryCards summary={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
