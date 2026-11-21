import type { LotHistory } from '../../api';
import { stageAnchorId } from './history-anchor';
import { HistoryIndex } from './history-index';
import { HistoryStage } from './history-stage';
import { OriginLinksRow } from './origin-links-row';
import type { OriginLinks } from '../../history/origin-links';
import { useActiveStage } from './use-active-stage';

// La línea de tiempo con su fila de íconos. Sabe cuál etapa se está leyendo y la marca en las dos,
// para ubicarse al recorrer una historia larga.
export function HistoryTimeline({
  history,
  originLinks,
}: {
  history: LotHistory;
  originLinks?: (history: LotHistory) => OriginLinks;
}) {
  const [active, select] = useActiveStage(history.stages.length);
  return (
    <>
      <HistoryIndex active={active} onSelect={select} stages={history.stages} />
      <ol aria-label="Etapas del lote" className="motion-stagger">
        {history.stages.map((stage, index) => (
          <HistoryStage
            active={index === active}
            anchorId={stageAnchorId(index)}
            harvestFooter={
              originLinks && <OriginLinksRow links={originLinks(history)} />
            }
            key={`${stage.kind}-${index}`}
            stage={stage}
          />
        ))}
      </ol>
    </>
  );
}
