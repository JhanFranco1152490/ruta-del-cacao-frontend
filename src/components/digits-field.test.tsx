import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { DigitsField } from './digits-field';

function Harness() {
  const { control } = useForm({ defaultValues: { document: '' } });
  return (
    <DigitsField
      control={control}
      name="document"
      label="Documento"
      maxLength={15}
    />
  );
}

describe('DigitsField', () => {
  it('keeps only digits while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByLabelText('Documento'), '12a3-4 5');

    expect(screen.getByLabelText('Documento')).toHaveValue('12345');
  });
});
