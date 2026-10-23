// El lote y la capacidad del cajón se pesan los dos en kg de cacao en baba, así que se pueden
// comparar. Superarla no impide iniciar: se avisa y se confirma, porque en la realidad un cajón se
// llena de más.
export const exceedsCapacity = (greenWeightKg: string, capacityKg: string) =>
  Number(greenWeightKg) > Number(capacityKg);
