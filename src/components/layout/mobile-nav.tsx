'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavItem } from '@/config/navigation';

import { NavList } from './nav-list';

// Sustituye a la barra lateral por debajo de lg. Se cierra al elegir una entrada: la
// navegación no recarga el layout, así que el panel seguiría abierto sobre la página nueva.
export function MobileNav({ items }: { items: readonly NavItem[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size="icon-lg"
            className="size-11 lg:hidden"
          />
        }
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle className="font-serif text-xl text-selva">
            Menú de navegación
          </SheetTitle>
        </SheetHeader>
        <NavList items={items} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
