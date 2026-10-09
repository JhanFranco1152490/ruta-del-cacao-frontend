import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProducerLine } from './producer-line';

const producer = {
  id: '33333333-3333-4333-8333-333333333333',
  member_code: 'PROD-000007',
  first_name: 'Ana',
  last_name: 'Prueba',
};

describe('ProducerLine', () => {
  it('names the producer with its code', () => {
    render(<ProducerLine producer={producer} />);

    expect(screen.getByText(/Productor:/)).toHaveTextContent(
      'Productor: Ana Prueba · PROD-000007',
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('links to the record of the producer when it can be opened', () => {
    render(<ProducerLine producer={producer} linkable />);

    expect(
      screen.getByRole('link', { name: 'Ana Prueba · PROD-000007' }),
    ).toHaveAttribute('href', `/productores/${producer.id}`);
  });
});
