'use client';

import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { cn } from 'cn';

// Menú desplegable sobre Base UI, la misma librería de Dialog y Sheet: foco, teclado y roles
// ARIA ya resueltos.
const Menu = MenuPrimitive.Root;
const MenuTrigger = MenuPrimitive.Trigger;

function MenuContent({ className, ...props }: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner align="end" sideOffset={6} className="z-50">
        <MenuPrimitive.Popup
          data-slot="menu-content"
          className={cn(
            'min-w-48 rounded-md border border-border bg-popover p-1 text-sm text-popover-foreground shadow-card outline-none',
            className,
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function MenuItem({ className, ...props }: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="menu-item"
      className={cn(
        'flex min-h-11 cursor-default items-center gap-2 rounded-sm px-3 font-bold text-selva outline-none select-none data-disabled:opacity-60 data-highlighted:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export { Menu, MenuContent, MenuItem, MenuTrigger };
