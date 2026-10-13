import { ProducerFilter } from '@/components/producer-filter';
import { useProducerSummary } from '@/lib/api/producer-options';

// De qué productor es la actividad que se programa. Solo lo elige la cuenta técnica, que alcanza a
// todos los productores: las fincas, las parcelas y los responsables que se ofrecen después son
// los de este. El productor no viaja en la petición, porque la parcela ya lo dice.
export function ActivityProducerField({
  value,
  onChange,
  disabled = false,
}: {
  value: string | undefined;
  onChange: (producer: string | undefined) => void;
  disabled?: boolean;
}) {
  const summary = useProducerSummary(value);
  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <ProducerFilter
        label="Productor"
        onClear={() => onChange(undefined)}
        onSelect={onChange}
        placeholder="Nombre, documento o código de asociado"
        producer={value}
        selected={summary}
      />
    </fieldset>
  );
}
