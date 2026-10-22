'use client';

import { Menu } from 'lucide-react';
import { useState } from 'react';

import { BotanicalVine } from '@/components/brand/botanical-vine';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { NavItem } from '@/types/navigation';

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
            className="size-11 shrink-0 lg:hidden"
          />
        }
      >
        <Menu aria-hidden="true" className="size-5" />
        <span className="sr-only">Abrir menú</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="scrollbar-on-dark w-80 max-w-[88vw] overflow-x-hidden border-selva-barra bg-selva-barra text-crema [&_[data-slot=sheet-close]]:bg-transparent [&_[data-slot=sheet-close]]:text-crema [&_[data-slot=sheet-close]]:shadow-none [&_[data-slot=sheet-close]]:ring-0 [&_[data-slot=sheet-close]]:hover:bg-white/10"
      >
        <SheetHeader>
          <SheetTitle className="font-serif text-xl text-crema">
            Menú de navegación
          </SheetTitle>
        </SheetHeader>
        <div className="relative flex flex-1 flex-col overflow-x-clip">
          {/* El adorno va fuera del flujo: así no suma alto ni hace aparecer la barra de
              desplazamiento del panel cuando el menú cabe. */}
          <BotanicalVine className="pointer-events-none absolute inset-x-0 bottom-0 -mx-4 h-40 w-72 opacity-40" />
          <div className="relative">
            <NavList items={items} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
