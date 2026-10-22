'use client';

import { useState } from 'react';

import { TextField } from '@/components/text-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  CATALOG_SEARCH_MIN_LENGTH,
  type CatalogInput,
  useCatalogSearch,
} from '../api';
import type { FarmChoice } from '../input-options';
import { InputMovementDialog } from './input-movement-dialog';

// Registrar la entrada de un insumo que todavía no está en la finca de quien la registra: lo
// busca por nombre en el catálogo del productor (sin ver lo que hay en otras fincas) y, al
// guardar la entrada, el insumo queda también en su finca.
export function CatalogEntryDialog({
  initialSearch = '',
  farms,
  farm,
  onClose,
  onSaved,
}: {
  initialSearch?: string;
  farms: readonly FarmChoice[];
  farm: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [chosen, setChosen] = useState<CatalogInput>();
  const term = search.trim();
  const found = useCatalogSearch(term);

  if (chosen)
    return (
      <InputMovementDialog
        farm={farm}
        farms={farms}
        input={chosen}
        kind="entry"
        onClose={onClose}
        onSaved={onSaved}
      />
    );

  const results = found.data ?? [];
  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      open
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Entrada de otro insumo</DialogTitle>
          <DialogDescription>
            Busca un insumo del catálogo que todavía no está en tu finca. Al
            registrarle la entrada, queda también en ella.
          </DialogDescription>
        </DialogHeader>
        <TextField
          autoFocus
          hint={`Escribe al menos ${CATALOG_SEARCH_MIN_LENGTH} letras del nombre.`}
          label="Buscar en el catálogo"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        {term.length >= CATALOG_SEARCH_MIN_LENGTH && (
          <div aria-live="polite">
            {found.isPending ? (
              <p role="status">Buscando…</p>
            ) : found.isError ? (
              <p className="text-sm font-bold text-err" role="alert">
                No fue posible buscar. Revisa tu conexión e inténtalo de nuevo.
              </p>
            ) : results.length === 0 ? (
              <p>No hay insumos activos con ese nombre.</p>
            ) : (
              <ul aria-label="Insumos encontrados" className="space-y-2">
                {results.map((input) => (
                  <li key={input.id}>
                    <Button
                      className="w-full justify-between"
                      onClick={() => setChosen(input)}
                      size="office"
                      variant="outline"
                    >
                      <span>{input.name}</span>
                      <span className="text-muted-foreground">
                        {input.unit}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
