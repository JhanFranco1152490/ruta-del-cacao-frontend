import { Ban } from 'lucide-react';

// Lo que se resalta dentro de una etapa: un descarte, parcial o completo. Color, ícono y texto.
export function DiscardNotice({ children }: { children: string }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-err-bg px-3 py-2 font-bold text-err">
      <Ban aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}
