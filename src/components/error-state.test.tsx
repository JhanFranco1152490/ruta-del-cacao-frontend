import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('announces the message and offers a retry when it can', async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="No se pudo cargar." onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar.');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no retry button without a handler', () => {
    render(<ErrorState message="No se pudo cargar." />);

    expect(
      screen.queryByRole('button', { name: 'Reintentar' }),
    ).not.toBeInTheDocument();
  });
});
