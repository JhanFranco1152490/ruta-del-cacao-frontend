// Input y Button base quitan el outline y lo cambian por un halo del 50 %. En estado de error
// las clases de la base ganan por orden de CSS y apagan ese halo, dejando el control sin foco
// visible. Estas clases restituyen el anillo global de 3 px cobre y anulan el halo para que
// nunca compitan.
export const FOCUS_OUTLINE_CLASS =
  'focus-visible:ring-0 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-cobre';
