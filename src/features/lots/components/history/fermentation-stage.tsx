import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatShortDateTime } from '@/lib/format/dates';

import type { StageOf } from '../../api';
import {
  countText,
  phRangeText,
  showRecordsText,
  temperatureRangeText,
  turnText,
} from '../../history/record-summary';
import { stageSpanText } from '../../history/stage-when';
import { HistoryEntry } from './history-entry';
import { HistoryRecords } from './history-records';

// La fermentación en una sola entrada, desde su inicio: el cajón, el resumen de los volteos y los
// volteos plegados.
export function FermentationStage({
  stage,
}: {
  stage: StageOf<'fermentation'>;
}) {
  const { fermentation } = stage;
  const temperature = temperatureRangeText(fermentation);
  const ph = phRangeText(fermentation);
  return (
    <HistoryEntry stage={stage}>
      <p className="font-semibold">{stageSpanText(fermentation)}</p>
      <KeyValues>
        <KeyValue label="Cajón">{fermentation.facility}</KeyValue>
        <KeyValue label="Responsable">{fermentation.responsible}</KeyValue>
        <KeyValue label="Volteos">
          {fermentation.turn_count === 0
            ? 'Sin volteos'
            : countText(fermentation.turn_count, 'volteo', 'volteos')}
        </KeyValue>
        {fermentation.last_turn_at && (
          <KeyValue label="Último volteo">
            {formatShortDateTime(fermentation.last_turn_at)}
          </KeyValue>
        )}
        {temperature && <KeyValue label="Temperatura">{temperature}</KeyValue>}
        {ph && <KeyValue label="pH del grano">{ph}</KeyValue>}
      </KeyValues>
      <HistoryRecords
        label={showRecordsText(fermentation.turns.length, 'volteo', 'volteos')}
        records={fermentation.turns.map((turn) => ({
          key: turn.turned_at,
          text: turnText(turn),
        }))}
      />
    </HistoryEntry>
  );
}
