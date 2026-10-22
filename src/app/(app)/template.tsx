import type { ReactNode } from 'react';

// A diferencia del layout, la plantilla se vuelve a montar en cada navegación: el contenido de la
// pantalla nueva aparece con un fundido en vez de cambiar de golpe. Solo opacidad: un
// desplazamiento volvería a esta capa el bloque de contención de las barras fijas mientras dura.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="motion-fade">{children}</div>;
}
