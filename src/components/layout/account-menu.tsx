'use client';

import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@/components/ui/menu';

// El correo de la cabecera abre las opciones de la cuenta. Recibe todo por props: el layout no
// lee la sesión.
export function AccountMenu({
  email,
  onOpenAccount,
  onLogout,
  isLoggingOut,
}: {
  email?: string;
  onOpenAccount: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  return (
    <Menu>
      <MenuTrigger
        aria-label={email ? `Cuenta de ${email}` : 'Tu cuenta'}
        render={
          <Button variant="outline" className="h-11 max-w-64 gap-2 px-3" />
        }
      >
        <UserRound aria-hidden="true" className="size-5 shrink-0" />
        <span className="hidden truncate sm:inline">{email}</span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
      </MenuTrigger>
      <MenuContent>
        <MenuItem onClick={onOpenAccount}>
          <UserRound aria-hidden="true" className="size-4" /> Mi cuenta
        </MenuItem>
        <MenuItem onClick={onLogout} disabled={isLoggingOut}>
          <LogOut aria-hidden="true" className="size-4" /> Cerrar sesión
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
