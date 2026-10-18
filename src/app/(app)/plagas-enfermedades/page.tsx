import { Suspense } from 'react';

import { PestListScreen } from '@/features/health/components/pest-list-screen';

// Los filtros llegan en la URL y los lee el navegador.
export default function PestsDiseasesPage() {
  return (
    <Suspense>
      <PestListScreen />
    </Suspense>
  );
}
