'use client';

import { Toast as ToastPrimitive } from '@base-ui/react/toast';
import { cva } from 'class-variance-authority';
import { cn } from 'cn';

// Abajo: en celular ocupa casi todo el ancho, al alcance del pulgar; desde `sm` mide lo de un aviso
// y se pega a la esquina derecha. Por encima de los diálogos (z-50) y del mapa, que va aislado.
export function ToastViewport({
  className,
  ...props
}: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      className={cn(
        'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[100] flex flex-col gap-2 outline-none sm:inset-x-auto sm:right-4 sm:w-96',
        className,
      )}
      data-slot="toast-viewport"
      {...props}
    />
  );
}

// Fondo blanco y borde de color a la izquierda, con el ícono dentro: el tipo nunca va solo en el
// color. Aparece subiendo y no anima con movimiento reducido; sigue al dedo al deslizarlo.
const toastRoot = cva(
  'relative flex w-full items-start gap-3 rounded-[var(--radius-card)] border border-l-4 border-border bg-card p-3 pr-1 text-foreground shadow-card transition-[transform,opacity] duration-200 ease-out translate-x-[var(--toast-swipe-movement-x)] translate-y-[var(--toast-swipe-movement-y)] data-[starting-style]:translate-y-3 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[limited]:hidden motion-reduce:transition-none motion-reduce:data-[starting-style]:translate-y-0',
  {
    variants: {
      type: {
        success: 'border-l-ok',
        info: 'border-l-info',
        warning: 'border-l-warn',
        error: 'border-l-err',
      },
    },
    defaultVariants: { type: 'info' },
  },
);

export function ToastRoot({
  type,
  className,
  ...props
}: ToastPrimitive.Root.Props & {
  type?: 'success' | 'info' | 'warning' | 'error';
}) {
  return (
    <ToastPrimitive.Root
      className={cn(toastRoot({ type }), className)}
      data-slot="toast"
      {...props}
    />
  );
}

export function ToastTitle({
  className,
  ...props
}: ToastPrimitive.Title.Props) {
  return (
    <ToastPrimitive.Title
      className={cn('text-sm font-bold', className)}
      data-slot="toast-title"
      {...props}
    />
  );
}

export function ToastDescription({
  className,
  ...props
}: ToastPrimitive.Description.Props) {
  return (
    <ToastPrimitive.Description
      className={cn('mt-0.5 text-sm text-muted-foreground', className)}
      data-slot="toast-description"
      {...props}
    />
  );
}

// Los botones miden 44 px como mínimo: con guantes o a pleno sol no se acierta uno pequeño.
export function ToastAction({
  className,
  ...props
}: ToastPrimitive.Action.Props) {
  return (
    <ToastPrimitive.Action
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center rounded-md px-3 text-sm font-bold text-selva underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
        className,
      )}
      data-slot="toast-action"
      {...props}
    />
  );
}

export function ToastClose({
  className,
  ...props
}: ToastPrimitive.Close.Props) {
  return (
    <ToastPrimitive.Close
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-alt hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre',
        className,
      )}
      data-slot="toast-close"
      {...props}
    />
  );
}

export const ToastProvider = ToastPrimitive.Provider;
export const ToastPortal = ToastPrimitive.Portal;
export const ToastContent = ToastPrimitive.Content;
export const useToastManager = ToastPrimitive.useToastManager;
