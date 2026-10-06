'use client';

import type { ComponentProps } from 'react';

import { SelectField } from '@/components/select-field';
import { useMunicipalities } from '@/lib/api/municipalities';

// El municipio de un formulario, con el catálogo cargándose o fallando a la vista de quien
// escribe. Recibe lo que `register` de react-hook-form entrega.
export function MunicipalitySelectField({
  placeholder = 'Selecciona un municipio',
  ...selectProps
}: Omit<ComponentProps<typeof SelectField>, 'children' | 'disabled'> & {
  placeholder?: string;
}) {
  const municipalities = useMunicipalities();
  return (
    <div>
      {/* Se remonta al llegar el catálogo: un select no controlado no vuelve a aplicar el valor
          guardado cuando aparecen sus opciones (al editar o corregir quedaría en blanco). */}
      <SelectField
        key={municipalities.isSuccess ? 'ready' : 'loading'}
        disabled={!municipalities.isSuccess}
        {...selectProps}
      >
        <option value="">
          {municipalities.isPending ? 'Cargando municipios…' : placeholder}
        </option>
        {municipalities.data?.map((municipality) => (
          <option key={municipality.code} value={municipality.code}>
            {municipality.name}
          </option>
        ))}
      </SelectField>
      {municipalities.isError && (
        <p className="mt-2 text-sm font-medium text-err" role="alert">
          No fue posible cargar los municipios. Inténtalo nuevamente.
        </p>
      )}
    </div>
  );
}
