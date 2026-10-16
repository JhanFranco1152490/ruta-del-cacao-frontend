import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SearchSelect, type SearchSelectOption } from './search-select';

const FARMS: SearchSelectOption[] = [
  { id: 'f1', label: 'La Esperanza' },
  { id: 'f2', label: 'El Retiro' },
  { id: 'f3', label: 'Cañas Gordas' },
];

function Harness({
  options = FARMS,
  initial = null,
  onChange = () => {},
  ...props
}: {
  options?: SearchSelectOption[];
  initial?: SearchSelectOption | null;
  onChange?: (option: SearchSelectOption | null) => void;
} & Partial<React.ComponentProps<typeof SearchSelect>>) {
  const [value, setValue] = useState(initial);
  return (
    <SearchSelect
      label="Finca"
      onChange={(option) => {
        setValue(option);
        onChange(option);
      }}
      options={options}
      value={value}
      {...props}
    />
  );
}

const field = () => screen.getByRole('combobox', { name: 'Finca' });
const optionNames = () =>
  screen.getAllByRole('option').map((option) => option.textContent);

describe('SearchSelect', () => {
  it('opens on the whole list', async () => {
    render(<Harness />);

    await userEvent.click(field());

    expect(optionNames()).toEqual([
      'La Esperanza',
      'El Retiro',
      'Cañas Gordas',
    ]);
  });

  it('narrows the list as the person types, ignoring accents and case', async () => {
    render(<Harness />);

    await userEvent.type(field(), 'CANAS');

    expect(optionNames()).toEqual(['Cañas Gordas']);
  });

  it('selects its text when it is focused, so what is typed replaces it', async () => {
    render(<Harness allLabel="Todas las fincas" />);
    const input = field() as HTMLInputElement;

    await userEvent.tab();

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Todas las fincas'.length);
    await userEvent.keyboard('ret');
    expect(input).toHaveValue('ret');
    expect(optionNames()).toEqual(['El Retiro']);
  });

  it('narrows the list when typing over a chosen option', async () => {
    render(<Harness initial={FARMS[0]} />);

    await userEvent.click(field());
    await userEvent.keyboard('cañas');

    expect(optionNames()).toEqual(['Cañas Gordas']);
  });

  it('says so when nothing matches', async () => {
    render(<Harness emptyMessage="Ninguna finca coincide." />);

    await userEvent.type(field(), 'zzz');

    expect(
      await screen.findByText('Ninguna finca coincide.'),
    ).toBeInTheDocument();
  });

  it('shows the whole list, not only the chosen option, when it is opened with one chosen', async () => {
    render(<Harness initial={FARMS[1]} />);

    expect(field()).toHaveValue('El Retiro');
    await userEvent.click(field());

    expect(optionNames()).toEqual([
      'La Esperanza',
      'El Retiro',
      'Cañas Gordas',
    ]);
  });

  it('still shows a chosen option that is not in the list', () => {
    render(<Harness initial={{ id: 'f9', label: 'Finca de otro grupo' }} />);

    expect(field()).toHaveValue('Finca de otro grupo');
  });

  it('gives the option chosen', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.click(field());
    await userEvent.click(screen.getByRole('option', { name: 'El Retiro' }));

    expect(onChange).toHaveBeenCalledWith(FARMS[1]);
    expect(field()).toHaveValue('El Retiro');
  });

  describe('with an entry for every option', () => {
    it('shows it as plain text while nothing is chosen, and first in the list', async () => {
      render(<Harness allLabel="Todas las fincas" />);

      expect(field()).toHaveValue('Todas las fincas');
      await userEvent.click(field());

      expect(optionNames()).toEqual([
        'Todas las fincas',
        'La Esperanza',
        'El Retiro',
        'Cañas Gordas',
      ]);
    });

    it('gives null when it is chosen again', async () => {
      const onChange = vi.fn();
      render(
        <Harness
          allLabel="Todas las fincas"
          initial={FARMS[0]}
          onChange={onChange}
        />,
      );

      await userEvent.click(field());
      await userEvent.click(
        screen.getByRole('option', { name: 'Todas las fincas' }),
      );

      expect(onChange).toHaveBeenCalledWith(null);
      expect(field()).toHaveValue('Todas las fincas');
    });

    it('has no clear button, because choosing it again already clears', () => {
      render(<Harness allLabel="Todas las fincas" initial={FARMS[0]} />);

      expect(
        document.querySelector('[data-slot="combobox-clear"]'),
      ).not.toBeInTheDocument();
    });
  });

  it('clears the choice with the clear button when there is no such entry', async () => {
    const onChange = vi.fn();
    render(<Harness initial={FARMS[0]} onChange={onChange} />);

    await userEvent.click(
      document.querySelector<HTMLElement>('[data-slot="combobox-clear"]')!,
    );

    expect(onChange).toHaveBeenCalledWith(null);
  });

  describe('with groups', () => {
    const PLOTS: SearchSelectOption[] = [
      { id: 'p1', label: 'P-01 · 2,4 ha', group: 'La Esperanza' },
      { id: 'p2', label: 'P-02 · 1 ha', group: 'La Esperanza' },
      { id: 'p3', label: 'P-03 · 3 ha', group: 'El Retiro' },
    ];

    it('shows each group under its heading', async () => {
      render(<Harness label="Parcela" options={PLOTS} />);

      await userEvent.click(screen.getByRole('combobox', { name: 'Parcela' }));

      // El contenedor del campo también es un grupo: solo cuentan los que tienen encabezado.
      const groups = screen
        .getAllByRole('group')
        .filter((group) => group.hasAttribute('aria-labelledby'));
      expect(groups).toHaveLength(2);
      expect(
        within(groups[0])
          .getAllByRole('option')
          .map((option) => option.textContent),
      ).toEqual(['P-01 · 2,4 ha', 'P-02 · 1 ha']);
      expect(screen.getByText('El Retiro')).toBeInTheDocument();
    });

    it('also finds a plot by the name of its group', async () => {
      render(<Harness label="Parcela" options={PLOTS} />);

      await userEvent.type(
        screen.getByRole('combobox', { name: 'Parcela' }),
        'retiro',
      );

      expect(optionNames()).toEqual(['P-03 · 3 ha']);
    });
  });

  describe('with options that cannot be chosen', () => {
    const PLOTS: SearchSelectOption[] = [
      { id: 'p1', label: 'P01', detail: '2,4 ha · CCN-51' },
      {
        id: 'p2',
        label: 'P02',
        detail: 'Sin siembras en su ficha',
        disabled: true,
      },
    ];

    it('shows them with the reason under the label, and does not give them', async () => {
      const onChange = vi.fn();
      render(<Harness label="Parcela" onChange={onChange} options={PLOTS} />);

      await userEvent.click(screen.getByRole('combobox', { name: 'Parcela' }));
      const blocked = screen.getByRole('option', { name: /P02/ });
      expect(blocked).toHaveTextContent('Sin siembras en su ficha');
      expect(blocked).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(blocked);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('still gives the ones that can be chosen', async () => {
      const onChange = vi.fn();
      render(<Harness label="Parcela" onChange={onChange} options={PLOTS} />);

      await userEvent.click(screen.getByRole('combobox', { name: 'Parcela' }));
      await userEvent.click(screen.getByRole('option', { name: /P01/ }));

      expect(onChange).toHaveBeenCalledWith(PLOTS[0]);
    });
  });

  describe('with a list that comes from the server', () => {
    it('reports what was typed once the person stops, and does not filter again', async () => {
      const onSearch = vi.fn();
      render(<Harness onSearch={onSearch} />);

      await userEvent.type(field(), 'ret');

      await waitFor(() => expect(onSearch).toHaveBeenLastCalledWith('ret'));
      expect(optionNames()).toEqual([
        'La Esperanza',
        'El Retiro',
        'Cañas Gordas',
      ]);
    });
  });

  it('can be disabled', () => {
    render(<Harness disabled />);

    expect(field()).toBeDisabled();
  });

  it('connects its hint and its error to the field', () => {
    const { rerender } = render(<Harness hint="Se muestran las primeras." />);

    expect(field()).toHaveAccessibleDescription('Se muestran las primeras.');

    rerender(<Harness error="Campo obligatorio" />);

    expect(field()).toBeInvalid();
    expect(field()).toHaveAccessibleDescription('Campo obligatorio');
  });
});
