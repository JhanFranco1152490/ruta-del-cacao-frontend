import { Ground, IllustrationFrame } from '@/components/brand/cacao-parts';

const BEANS = Array.from({ length: 9 }, (_, index) => 92 + index * 6);

// Un cajón de fermentación de madera y una marquesina de secado con grano. Para Infraestructura.
export function DryingShed({ className }: { className?: string }) {
  return (
    <IllustrationFrame className={className}>
      <Ground width={62} />
      <rect x="20" y="92" width="52" height="36" fill="var(--cobre)" />
      <path
        d="M20 104 H72 M20 116 H72"
        stroke="var(--mazorca-negra)"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      <rect x="16" y="86" width="60" height="7" fill="var(--mazorca-negra)" />
      <path
        d="M86 128 V78 M146 128 V78"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M80 80 Q116 48 152 80Z" fill="var(--card)" fillOpacity=".85" />
      <path
        d="M80 80 Q116 48 152 80"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M88 108 H144"
        stroke="var(--mazorca-negra)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {BEANS.map((x, index) => (
        <ellipse
          cx={x}
          cy="104"
          fill={index % 3 ? 'var(--morado-cacao)' : 'var(--amarillo-mazorca)'}
          key={x}
          rx="3.2"
          ry="2.2"
        />
      ))}
    </IllustrationFrame>
  );
}
