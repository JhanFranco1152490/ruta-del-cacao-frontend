'use client';

import { QrCode } from 'lucide-react';
import { useState } from 'react';

import { HERO_SECONDARY_CLASS } from '@/components/page-blocks/detail-hero';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/use-session';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

import type { Lot } from '../api';
import { LotQrDialog } from './lot-qr-dialog';
import { qrAction } from './qr-action';

// El botón de la ficha: aparece solo si el lote puede tener código QR y la cuenta puede generarlo, o
// si ya tiene uno para ver.
export function LotQrButton({ lot }: { lot: Lot }) {
  const { data: user } = useSession();
  const [open, setOpen] = useState(false);
  const action = qrAction(
    lot,
    hasPermission(user, PERMISSIONS.LOTS_GENERATE_QR),
  );
  if (action === 'none') return null;
  return (
    <>
      <Button
        className={HERO_SECONDARY_CLASS}
        onClick={() => setOpen(true)}
        size="office"
        variant="outline"
      >
        <QrCode aria-hidden="true" className="size-4" /> Código QR
      </Button>
      {open && <LotQrDialog lot={lot} onClose={() => setOpen(false)} />}
    </>
  );
}
