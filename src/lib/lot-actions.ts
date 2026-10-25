import type { LucideIcon } from 'lucide-react';

// Algo que se hace con un lote en la etapa en que está, y adónde lleva. Lotes pinta el menú de cada
// fila; cada módulo del proceso (fermentación, secado…) decide qué ofrece para sus estados, sin que
// Lotes lo importe ni ellos importen de Lotes: las une la página.
export type LotAction = {
  id: string;
  label: string;
  // Siempre una página: si lo que se hace es un formulario emergente, la ruta lo abre al llegar.
  href: string;
  icon: LucideIcon;
};
