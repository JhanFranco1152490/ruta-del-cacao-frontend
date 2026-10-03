import { Suspense } from 'react';

import { FarmDetailWithPlots } from './farm-detail-with-plots';

// Página fija: el id llega como parámetro de la URL y lo lee el navegador, así que la misma
// página guardada abre sin conexión cualquier finca. Leer `searchParams` en el servidor la haría
// dinámica.
export default function FarmDetailPage() {
  return (
    <Suspense>
      <FarmDetailWithPlots />
    </Suspense>
  );
}
