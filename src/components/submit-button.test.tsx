import { render, screen } from '@testing-library/react';
import { describe, it } from 'vitest';

import { expectVisibleFocusOutline } from '@/test/focus-outline';

import { SubmitButton } from './submit-button';

describe('SubmitButton', () => {
  it('keeps the visible focus outline', () => {
    render(<SubmitButton pending={false}>Guardar</SubmitButton>);

    expectVisibleFocusOutline(screen.getByRole('button', { name: 'Guardar' }));
  });
});
