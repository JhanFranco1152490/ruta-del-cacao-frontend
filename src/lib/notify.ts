import { Toast } from '@base-ui/react/toast';

import { TOAST_DURATION_MS } from '@/config/toast';

export type NoticeType = 'success' | 'info' | 'warning' | 'error';

export type NoticeOptions = {
  // Solo si añade algo que el título no dice. Nunca datos personales (nombres, documentos,
  // correos): «Productor guardado», no «Ana Pérez guardada».
  description?: string;
  // Una acción como máximo. Lo que ofrece nunca debe ser la única forma de hacerlo: el aviso se
  // cierra solo.
  action?: { label: string; onClick: () => void };
  // No se cierra solo y se anuncia con urgencia, como un error: lo que avisa pide actuar ya y no
  // se puede perder porque la persona miró a otro lado.
  persistent?: boolean;
};

// El gestor es global para poder avisar desde fuera de un componente (un hook de mutación, la
// cola). El contenedor que los pinta es `Toaster`, montado una vez en los proveedores.
export const toastManager = Toast.createToastManager();

function add(
  type: NoticeType,
  title: string,
  { description, action, persistent = false }: NoticeOptions = {},
) {
  const urgent = type === 'error' || persistent;
  const id: string = toastManager.add({
    type,
    title,
    description,
    // Un error de una acción no se cierra solo y se anuncia con urgencia: si desaparece, la
    // persona no sabe qué falló. Igual un aviso persistente.
    timeout: urgent
      ? TOAST_DURATION_MS.persistent
      : action
        ? TOAST_DURATION_MS.withAction
        : TOAST_DURATION_MS.notice,
    priority: urgent ? 'high' : 'low',
    // Quien pulsa la acción ya actuó: el aviso se cierra.
    actionProps: action && {
      children: action.label,
      onClick: () => {
        action.onClick();
        toastManager.close(id);
      },
    },
  });
  return id;
}

// Qué avisa un aviso flotante: lo que terminó bien y no pide nada, o lo que falló en una acción sin
// formulario. Los errores de un formulario van junto a él y el estado de la cola va en su panel.
export const notify = {
  success: (title: string, options?: NoticeOptions) =>
    add('success', title, options),
  info: (title: string, options?: NoticeOptions) => add('info', title, options),
  warning: (title: string, options?: NoticeOptions) =>
    add('warning', title, options),
  error: (title: string, options?: NoticeOptions) =>
    add('error', title, options),
  dismiss: (id?: string) => toastManager.close(id),
};

// Lo que el servidor encontró en algo que se acaba de guardar (un desvío en una medición): una
// advertencia, que no se cierra sola si pide actuar ya.
export type Finding = {
  title: string;
  description?: string;
  critical: boolean;
};

export const notifyFinding = ({ title, description, critical }: Finding) =>
  notify.warning(title, { description, persistent: critical });
