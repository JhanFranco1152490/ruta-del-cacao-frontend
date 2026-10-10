'use client';

import {
  ClipboardList,
  History,
  MoreHorizontal,
  PackagePlus,
  Pencil,
  Power,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

import { Button, buttonVariants } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';

import type { AgriculturalInput } from '../api';
import { inputMovementsPath } from '../input-paths';

export type InputActionKind = 'edit' | 'status' | 'delete' | 'entry' | 'count';

export type InputPermissions = {
  canChange: boolean;
  canDelete: boolean;
  canManageStock: boolean;
};

// Sin conexión las acciones se ven deshabilitadas, no ocultas: así se entiende que vuelven con la
// señal. Las de inventario necesitan una finca elegida.
export function InputRowActions({
  input,
  farm,
  permissions: { canChange, canDelete, canManageStock },
  disabled,
  onAction,
}: {
  input: AgriculturalInput;
  farm: string | null;
  permissions: InputPermissions;
  disabled: boolean;
  onAction: (kind: InputActionKind, input: AgriculturalInput) => void;
}) {
  const stockActions = canManageStock && !!farm;
  const canRemove = canDelete && !input.has_records;
  const hasMenu = !!farm || canChange || canRemove || stockActions;

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {/* Lo que más se hace con el inventario va a la vista; el menú tiene todas las acciones. */}
      {stockActions && input.is_active && (
        <Button
          aria-label={`Registrar entrada de ${input.name}`}
          disabled={disabled}
          onClick={() => onAction('entry', input)}
          size="office"
          variant="outline"
        >
          <PackagePlus aria-hidden="true" /> Entrada
        </Button>
      )}
      {farm && (
        <Link
          aria-label={`Ver movimientos de ${input.name}`}
          className={buttonVariants({ size: 'office', variant: 'outline' })}
          href={inputMovementsPath(input.id, farm)}
        >
          <History aria-hidden="true" /> Movimientos
        </Link>
      )}
      {canChange && (
        <Button
          aria-label={`Editar ${input.name}`}
          disabled={disabled}
          onClick={() => onAction('edit', input)}
          size="office"
          variant="outline"
        >
          <Pencil aria-hidden="true" /> Editar
        </Button>
      )}
      {hasMenu && (
        <Menu>
          <MenuTrigger
            aria-label={`Más acciones de ${input.name}`}
            render={<Button size="office" variant="outline" />}
          >
            <MoreHorizontal aria-hidden="true" />
          </MenuTrigger>
          <MenuContent>
            {stockActions && input.is_active && (
              <MenuItem
                disabled={disabled}
                onClick={() => onAction('entry', input)}
              >
                <PackagePlus aria-hidden="true" className="size-4" />
                Registrar entrada
              </MenuItem>
            )}
            {stockActions && (
              <MenuItem
                disabled={disabled}
                onClick={() => onAction('count', input)}
              >
                <ClipboardList aria-hidden="true" className="size-4" />
                Registrar conteo
              </MenuItem>
            )}
            {farm && (
              <MenuItem
                render={<Link href={inputMovementsPath(input.id, farm)} />}
              >
                <History aria-hidden="true" className="size-4" />
                Ver movimientos
              </MenuItem>
            )}
            {canChange && (
              <MenuItem
                disabled={disabled}
                onClick={() => onAction('status', input)}
              >
                <Power aria-hidden="true" className="size-4" />
                {input.is_active ? 'Desactivar' : 'Activar'}
              </MenuItem>
            )}
            {canRemove && (
              <MenuItem
                className="text-destructive"
                disabled={disabled}
                onClick={() => onAction('delete', input)}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Eliminar
              </MenuItem>
            )}
          </MenuContent>
        </Menu>
      )}
    </div>
  );
}
