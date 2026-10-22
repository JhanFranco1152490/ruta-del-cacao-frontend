'use client';

import { useState } from 'react';

import { CheckboxField } from '@/components/checkbox-field';
import { TextField } from '@/components/text-field';
import { FormDialog } from '@/components/form-dialog';
import { getErrorMessage, isApiError } from '@/lib/api/errors';
import { type Role, useCreateRole } from '@/lib/api/roles';

const NAME_MAX_LENGTH = 100;

// Parte de un rol del sistema (por ejemplo, Capataz/Operario), deja quitar los permisos que no
// se quieren dar y lo guarda como un rol propio del productor con otro nombre. Así se arma un
// "Operario" sin salir del formulario de la cuenta, y para el siguiente empleado ya está en la
// lista. Solo quita permisos: para dar otros está la pantalla de Roles.
export function CustomizeRoleDialog({
  base,
  producer,
  onClose,
  onCreated,
}: {
  base: Role;
  // Solo la cuenta técnica lo indica: el productor del rol nuevo.
  producer?: string;
  onClose: () => void;
  onCreated: (role: Role) => void;
}) {
  const create = useCreateRole();
  const [name, setName] = useState('');
  const [codes, setCodes] = useState<string[]>(base.permissions);
  const [nameError, setNameError] = useState<string>();
  const [failure, setFailure] = useState<string>();

  async function save() {
    setFailure(undefined);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Ponle un nombre al rol, por ejemplo «Operario».');
      return;
    }
    if (!codes.length) {
      setFailure('Deja al menos un permiso.');
      return;
    }
    try {
      onCreated(
        await create.mutateAsync({
          name: trimmed,
          description: `Basado en ${base.name}.`,
          permission_codes: codes,
          // El atajo parte del rol base: un Operario sigue siendo de una sola finca.
          farm_scope: base.farm_scope ?? 'many',
          ...(producer ? { producer_id: producer } : {}),
        }),
      );
    } catch (error) {
      if (isApiError(error) && error.code === 'duplicate_role_name') {
        setNameError('Ya hay un rol con ese nombre.');
        return;
      }
      setFailure(getErrorMessage(error, 'No fue posible crear el rol.'));
    }
  }

  return (
    <FormDialog
      onClose={onClose}

      description="Quita lo que esta persona no debe hacer. Se guarda como un rol propio y queda en la lista para los siguientes empleados."
      error={failure}
      isSaving={create.isPending}
      onSubmit={(event) => {
        event.preventDefault();
        // El diálogo sale por un portal, pero en React el evento sigue subiendo hasta el
        // formulario de la cuenta: sin esto, guardar el rol enviaría también la cuenta.
        event.stopPropagation();
        void save();
      }}
      submitLabel="Guardar rol"
      title={`Personalizar permisos de ${base.name}`}
    >
      <TextField
        disabled={create.isPending}
        error={nameError}
        label="Nombre del rol"
        maxLength={NAME_MAX_LENGTH}
        onChange={(event) => {
          setName(event.target.value);
          setNameError(undefined);
        }}
        placeholder="Por ejemplo, Operario"
        value={name}
      />
      <fieldset className="space-y-1">
        <legend className="mb-2 font-bold text-selva">Permisos</legend>
        {base.permission_details.map((permission) => (
          <CheckboxField
            checked={codes.includes(permission.code)}
            disabled={create.isPending}
            key={permission.code}
            label={permission.name}
            onCheckedChange={(checked) =>
              setCodes(
                checked
                  ? [...codes, permission.code]
                  : codes.filter((code) => code !== permission.code),
              )
            }
          />
        ))}
      </fieldset>
    </FormDialog>
  );
}
