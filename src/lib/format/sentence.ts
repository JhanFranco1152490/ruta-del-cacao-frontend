// Cierra una frase con punto sin duplicarlo: la hora termina en «a.m.» o «p.m.», que ya lo trae.
export const endSentence = (text: string) =>
  text.endsWith('.') ? text : `${text}.`;
