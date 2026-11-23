'use client';

import { CacaoMark } from '@/components/brand/cacao-mark';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LotQrTag } from '@/components/illustrations/lot-qr-tag';
import { LoadingBlock } from '@/components/loading-block';
import { pageContainerClass } from '@/components/page-container';
import { ASSOCIATION_NAME } from '@/config/association';

import { usePublicLotTraceability } from '../../public-traceability';
import {
  TRACEABILITY_PROBLEM_TEXT,
  traceabilityProblem,
} from '../../traceability-problem';
import { TraceabilityFigures } from './traceability-figures';
import { TraceabilityHero } from './traceability-hero';
import { TraceabilityJourney } from './traceability-journey';
import { TraceabilityQuality } from './traceability-quality';

// La página que abre el código QR de un lote: sin cuenta, fuera del marco de la app, pensada para
// leerse en un celular. Muestra de dónde viene el lote, por dónde pasó y con qué calidad salió.
export function PublicTraceabilityScreen({ token }: { token: string }) {
  const read = usePublicLotTraceability(token);

  return (
    <>
      <header className="bg-selva text-crema">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <CacaoMark className="size-7 text-oro" />
          <span className="font-serif text-xl">Ruta del Cacao</span>
        </div>
      </header>
      <main className={pageContainerClass('narrow', 'flex-1 space-y-4')}>
        <Body read={read} />
      </main>
      <footer className="border-t bg-card px-4 py-4 text-center text-sm text-muted-foreground">
        <p className="font-bold text-foreground">{ASSOCIATION_NAME}</p>
        <p>Información registrada por el productor en Ruta del Cacao.</p>
      </footer>
    </>
  );
}

function Body({ read }: { read: ReturnType<typeof usePublicLotTraceability> }) {
  if (read.isPending) {
    return (
      <LoadingBlock
        label="Cargando la trazabilidad del lote"
        shapes={['h-24', 'h-20', 'h-64', 'h-40']}
      />
    );
  }
  if (read.isError) {
    const problem = traceabilityProblem(read.error);
    const text = TRACEABILITY_PROBLEM_TEXT[problem];
    if (problem === 'not_found') {
      return (
        <EmptyState
          description={text.description}
          illustration={LotQrTag}
          title={text.title}
        />
      );
    }
    return (
      <ErrorState
        message={text.title}
        onRetry={problem === 'too_many' ? undefined : () => void read.refetch()}
      />
    );
  }
  const { data } = read;
  return (
    <>
      <TraceabilityHero data={data} />
      <TraceabilityFigures data={data} />
      <TraceabilityJourney stages={data.stages} />
      <TraceabilityQuality quality={data.quality} />
    </>
  );
}
