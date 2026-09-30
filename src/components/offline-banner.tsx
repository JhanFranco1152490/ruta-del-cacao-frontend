import { CloudOff, CloudUpload, TriangleAlert, Wifi } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';
import type { SyncStatus } from '@/types/sync';

type BannerContent = {
  tone: 'ok' | 'warn' | 'err' | 'info';
  title: string;
  detail: string;
  Icon: typeof Wifi;
};

function countLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getBannerContent(status: SyncStatus): BannerContent {
  if (!status.isWithinOfflineWindow) {
    return {
      tone: 'warn',
      title: 'Inicio de sesión requerido',
      detail:
        'Inicia sesión cuando recuperes la conexión antes de registrar más cambios.',
      Icon: TriangleAlert,
    };
  }
  if (!status.isOnline) {
    return {
      tone: 'info',
      title: 'Sin conexión',
      detail: `${countLabel(status.pendingCount, 'registro en cola', 'registros en cola')}. Los cambios se guardarán en este dispositivo.`,
      Icon: CloudOff,
    };
  }
  if (status.errorCount > 0) {
    return {
      tone: 'err',
      title: 'Revisión necesaria',
      detail: `${countLabel(status.errorCount, 'registro requiere', 'registros requieren')} revisión antes de sincronizarse.`,
      Icon: TriangleAlert,
    };
  }
  if (status.pendingCount > 0) {
    return {
      tone: 'info',
      title: 'Con conexión',
      detail: `${countLabel(status.pendingCount, 'registro pendiente', 'registros pendientes')} de sincronización.`,
      Icon: CloudUpload,
    };
  }
  return {
    tone: 'ok',
    title: 'Con conexión',
    detail: 'Sin registros pendientes de sincronización.',
    Icon: Wifi,
  };
}

export function OfflineBanner({ status }: { status: SyncStatus }) {
  const { tone, title, detail, Icon } = getBannerContent(status);

  return (
    <section
      className="flex gap-3 rounded-[12px] border-[2.5px] border-ink bg-card p-4"
      role="status"
    >
      <Icon aria-hidden="true" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0 space-y-1">
        <StatusBadge solid tone={tone}>
          {title}
        </StatusBadge>
        <p className="text-sm font-bold text-foreground">{detail}</p>
      </div>
    </section>
  );
}
