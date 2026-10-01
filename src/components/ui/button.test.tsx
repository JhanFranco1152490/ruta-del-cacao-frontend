import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './button';

describe('Button', () => {
  it('provides the tall copper field action for capture screens', () => {
    render(
      <Button size="field" variant="copper">
        Capturar GPS
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Capturar GPS' });
    expect(button).toHaveClass('bg-cobre', 'h-16');
    expect(button).not.toHaveClass('border-[2.5px]');
  });
});
