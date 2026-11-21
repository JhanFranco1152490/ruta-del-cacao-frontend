import { Ban } from 'lucide-react';

import { StatusBadge } from '@/components/status-badge';

// La marca de una venta o una salida anuladas, con el mismo aviso que usa Bodega en sus salidas.
export const VoidedBadge = () => (
  <StatusBadge icon={Ban} tone="warn">
    Anulada
  </StatusBadge>
);

// Cuándo, quién y por qué se anuló, debajo de los datos.
export const VoidedLine = ({ children }: { children: string }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);
