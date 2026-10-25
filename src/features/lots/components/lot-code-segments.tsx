import { lotCodeSegments } from '@/lib/format/lot-code';

// El código del lote partido en sus pedazos, cada uno con su nombre y lo que dice hoy (la finca, la
// parcela, la fecha): se lee de un vistazo y no hace falta un párrafo que lo explique. Va dentro del
// título de la cabecera, que sigue diciendo el código completo a quien usa un lector de pantalla.
export function LotCodeSegments({
  code,
  farmName,
  plotName,
}: {
  code: string;
  farmName: string;
  plotName?: string | null;
}) {
  const segments = lotCodeSegments(code, { farmName, plotName });
  if (!segments) {
    return (
      <span className="font-mono text-2xl font-bold break-all">{code}</span>
    );
  }
  return (
    <span className="mt-2 flex flex-wrap gap-2 font-sans">
      {segments.map(({ value, label, note }) => (
        <span
          className="block min-w-0 rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/15"
          key={label}
        >
          <span className="block font-mono text-xl leading-tight font-bold tracking-wide sm:text-2xl">
            {value}
          </span>
          <span className="block text-[0.7rem] font-bold tracking-[0.1em] text-[var(--oro-claro)] uppercase">
            {label}
          </span>
          <span className="block text-xs break-words text-white/85">
            {note}
          </span>
        </span>
      ))}
    </span>
  );
}
