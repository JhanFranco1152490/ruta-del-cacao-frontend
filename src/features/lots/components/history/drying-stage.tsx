import { KeyValue, KeyValues } from '@/components/page-blocks/section-card';
import { formatFixedDecimal } from '@/lib/format/decimal';
import { moistureText } from '@/lib/postharvest/measure-text';
import { kilosText } from '@/lib/stock-quantity';

import type { StageOf } from '../../api';
import {
  countText,
  dryingLogText,
  showRecordsText,
} from '../../history/record-summary';
import { stageSpanText } from '../../history/stage-when';
import { HistoryEntry } from './history-entry';
import { HistoryRecords } from './history-records';

// El secado en una sola entrada, desde su inicio: la marquesina, la humedad, las horas de sol y, al
// terminar, lo que dio. La bitácora va plegada.
export function DryingStage({ stage }: { stage: StageOf<'drying'> }) {
  const { drying } = stage;
  const finished = drying.ended_at !== null;
  return (
    <HistoryEntry stage={stage}>
      <p className="font-semibold">{stageSpanText(drying)}</p>
      <KeyValues>
        <KeyValue label="Marquesina">{drying.facility}</KeyValue>
        <KeyValue label="Responsable">{drying.responsible}</KeyValue>
        <KeyValue label="Humedad de entrada">
          {moistureText(drying.entry_moisture_pct)}
        </KeyValue>
        <KeyValue label="Bitácora">
          {drying.log_count === 0
            ? 'Sin registros'
            : countText(drying.log_count, 'día registrado', 'días registrados')}
        </KeyValue>
        {!finished && drying.last_moisture_pct && (
          <KeyValue label="Última humedad">
            {moistureText(drying.last_moisture_pct)}
          </KeyValue>
        )}
        <KeyValue label="Horas de sol">
          {formatFixedDecimal(drying.total_sun_hours, 1)} h
        </KeyValue>
        {drying.final_moisture_pct && (
          <KeyValue label="Humedad final">
            {moistureText(drying.final_moisture_pct)}
          </KeyValue>
        )}
        {drying.dry_weight_kg && (
          <KeyValue label="Peso seco">
            {kilosText(drying.dry_weight_kg)} kg
          </KeyValue>
        )}
        {drying.yield_pct && (
          <KeyValue label="Rendimiento">
            {formatFixedDecimal(drying.yield_pct, 1)} %
          </KeyValue>
        )}
      </KeyValues>
      <HistoryRecords
        label={showRecordsText(drying.logs.length, 'día', 'días')}
        records={drying.logs.map((log) => ({
          key: log.log_date,
          text: dryingLogText(log),
        }))}
      />
    </HistoryEntry>
  );
}
