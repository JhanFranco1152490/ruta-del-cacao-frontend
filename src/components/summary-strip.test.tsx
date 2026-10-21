import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SummaryItem, SummaryStrip } from './summary-strip';

describe('SummaryStrip', () => {
  it('groups its items under one label, each with its title', () => {
    render(
      <SummaryStrip label="Totales del mes">
        <SummaryItem title="Sin lote">
          <p>2 cosechas</p>
        </SummaryItem>
        <SummaryItem title="Por variedad">
          <p>CCN-51</p>
        </SummaryItem>
      </SummaryStrip>,
    );

    const group = screen.getByRole('region', { name: 'Totales del mes' });
    expect(within(group).getByText('Sin lote')).toBeInTheDocument();
    expect(within(group).getByText('2 cosechas')).toBeInTheDocument();
    expect(within(group).getByText('Por variedad')).toBeInTheDocument();
  });
});
