import Link from 'next/link';

export function BackToProducersLink() {
  return (
    <Link
      className="text-sm font-bold text-selva-2 hover:underline"
      href="/productores"
    >
      ← Volver a productores
    </Link>
  );
}
