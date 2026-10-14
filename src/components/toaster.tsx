'use client';

import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
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
import { TOAST_DURATION_MS, TOAST_LIMIT } from '@/config/toast';
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

const SWIPE_TO_DISMISS = ['down', 'right'] as ('down' | 'right')[];

function Notices() {
  const { toasts } = useToastManager();
  // Se desliza hacia abajo (el borde más cercano) o hacia la derecha: no hace falta acertar el botón
  // de cerrar.

  return (
    <ToastPortal>
      <ToastViewport>
        {toasts.map((toast) => {
          const type = (toast.type ?? 'info') as NoticeType;
          const Icon = ICONS[type] ?? Info;
          return (
            <ToastRoot
              key={toast.id}
              swipeDirection={SWIPE_TO_DISMISS}
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
  return (
    <ToastProvider
      limit={TOAST_LIMIT}
      timeout={TOAST_DURATION_MS.notice}
      toastManager={toastManager}
    >
      <Notices />
    </ToastProvider>
  );
}
