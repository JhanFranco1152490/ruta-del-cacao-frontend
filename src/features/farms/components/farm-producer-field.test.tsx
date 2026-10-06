import { screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/test/render';

import type { FarmFormValues } from '../schemas';
import { FarmProducerField } from './farm-producer-field';

let connected = true;
vi.mock('@/hooks/use-has-connection', () => ({
  useHasConnection: () => connected,
}));

const PRODUCER = '33333333-3333-4333-8333-333333333333';

function Harness({ producer }: { producer?: string }) {
  const { control } = useForm<FarmFormValues>({
    defaultValues: { producer_id: producer } as FarmFormValues,
  });
  return <FarmProducerField control={control} />;
}

describe('FarmProducerField without a connection', () => {
  it('says the producer cannot be chosen yet', () => {
    connected = false;
    renderWithProviders(<Harness />);

    expect(
      screen.getByText(
        'Necesitas conexión para elegir el productor de la finca.',
      ),
    ).toBeVisible();
    expect(screen.queryByLabelText('Productor')).not.toBeInTheDocument();
  });

  it('lets the producer that was already chosen stand', () => {
    connected = false;
    renderWithProviders(<Harness producer={PRODUCER} />);

    expect(
      screen.getByText(/Ya hay un productor elegido para esta finca/),
    ).toBeVisible();
  });
});
