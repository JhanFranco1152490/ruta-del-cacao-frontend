'use client';

import {
  type Control,
  type FieldPath,
  type FieldValues,
  useController,
} from 'react-hook-form';

import { SearchSelect } from '@/components/search-select';
import { useMunicipalities } from '@/lib/api/municipalities';

// El municipio de un formulario, con el catálogo cargándose o fallando a la vista de quien
// escribe. Es una lista que se puede escribir (son 40) y guarda el código del municipio en el
// campo del formulario que se le indica.
export function MunicipalitySelectField<T extends FieldValues>({
  control,
  name,
  label,
  error,
  placeholder = 'Selecciona un municipio',
  inputClassName,
  className,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  error?: string;
  placeholder?: string;
  // La densidad del formulario: el de captura en campo usa controles más altos.
  inputClassName?: string;
  className?: string;
}) {
  const municipalities = useMunicipalities();
  const { field } = useController({ control, name });
  const options = (municipalities.data ?? []).map(({ code, name: label }) => ({
    id: code,
    label,
  }));
  const code = (field.value as string | undefined) ?? '';
  // Un municipio ya guardado no tiene su nombre hasta que llega el catálogo: mientras tanto el
  // campo está deshabilitado y muestra el texto de «Cargando…».
  const selected = code
    ? (options.find(({ id }) => id === code) ?? { id: code, label: '' })
    : null;

  return (
    <div className={className}>
      <SearchSelect
        disabled={!municipalities.isSuccess}
        error={error}
        inputClassName={inputClassName}
        label={label}
        onBlur={field.onBlur}
        onChange={(option) => field.onChange(option?.id ?? '')}
        options={options}
        placeholder={
          municipalities.isPending ? 'Cargando municipios…' : placeholder
        }
        value={selected}
      />
      {municipalities.isError && (
        <p className="mt-2 text-sm font-medium text-err" role="alert">
          No fue posible cargar los municipios. Inténtalo nuevamente.
        </p>
      )}
    </div>
  );
}
