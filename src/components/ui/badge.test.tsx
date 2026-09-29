import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './badge';

describe('Badge', () => {
  it.each([
    ['ok-solid', 'bg-ok-solid'],
    ['warn-solid', 'bg-warn-solid'],
    ['err-solid', 'bg-err-solid'],
    ['info-solid', 'bg-info-solid'],
  ] as const)('supports the %s field variant', (variant, className) => {
    render(<Badge variant={variant}>Estado</Badge>);

    expect(screen.getByText('Estado')).toHaveClass(className);
  });
});
