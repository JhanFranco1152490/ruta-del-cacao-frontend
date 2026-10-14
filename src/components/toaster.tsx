'use client';

import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { ToastPositionPicker } from '@/components/toast-position-picker';
import {
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastPortal,
  ToastProvider,
  ToastRoot,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from '@/components/ui/toast';
import {
  TOAST_DURATION_MS,
  TOAST_LIMIT,
  type ToastPosition,
} from '@/config/toast';
import { setToastPosition, useToastPosition } from '@/hooks/use-toast-position';
import { toastManager, type NoticeType } from '@/lib/notify';

const ICONS: Record<NoticeType, typeof Info> = {
  success: CircleCheck,
  info: Info,
  warning: TriangleAlert,
  error: CircleX,
};

const ICON_COLORS: Record<NoticeType, string> = {
  success: 'text-ok',
  info: 'text-info',
  warning: 'text-warn',
  error: 'text-err',
};

function Notices({ position }: { position: ToastPosition }) {
  const { toasts } = useToastManager();
  // Se desliza hacia el borde más cercano, y de lado hacia el que lo pega: no hace falta acertar el
  // botón de cerrar.
  const swipe = [
    position.vertical === 'bottom' ? ('down' as const) : ('up' as const),
    position.horizontal === 'left' ? ('left' as const) : ('right' as const),
  ];

  return (
    <ToastPortal>
      <ToastViewport position={position}>
        {toasts.map((toast) => {
          const type = (toast.type ?? 'info') as NoticeType;
          const Icon = ICONS[type] ?? Info;
          return (
            <ToastRoot
              key={toast.id}
              swipeDirection={swipe}
              toast={toast}
              type={type}
            >
              <ToastContent className="flex w-full items-start gap-3">
                <Icon
                  aria-hidden="true"
                  className={`mt-0.5 size-5 shrink-0 ${ICON_COLORS[type]}`}
                />
                <div className="min-w-0 flex-1 py-0.5">
                  <ToastTitle />
                  <ToastDescription />
                </div>
                {toast.actionProps && <ToastAction />}
                <ToastClose aria-label="Cerrar aviso">
                  <X aria-hidden="true" className="size-4" />
                </ToastClose>
              </ToastContent>
            </ToastRoot>
          );
        })}
      </ToastViewport>
    </ToastPortal>
  );
}

// Los avisos flotantes de la app: se monta una vez, en los proveedores, y se lanzan con `notify`.
export function Toaster() {
  const position = useToastPosition();

  return (
    <ToastProvider
      limit={TOAST_LIMIT}
      timeout={TOAST_DURATION_MS.notice}
      toastManager={toastManager}
    >
      <Notices position={position} />
      <ToastPositionPicker onChange={setToastPosition} value={position} />
    </ToastProvider>
  );
}
