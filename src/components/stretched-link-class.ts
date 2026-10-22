// Una tarjeta con un enlace principal se abre tocándola en cualquier parte: el enlace se estira con
// un `::after` sobre toda la tarjeta, que por eso es `relative` (y el enlace, no). Lo demás que se
// pueda tocar dentro de la tarjeta (otro enlace, un menú) lleva `relative z-10` para quedar encima.
export const STRETCHED_LINK_CLASS =
  'after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none';

// El aro de enfoque de una tarjeta cuyo enlace principal tiene el foco del teclado.
export const STRETCHED_CARD_FOCUS_CLASS =
  'has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-cobre';
