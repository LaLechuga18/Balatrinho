// Definimos los 4 palos exactos que existen
export type Palo = 'Corazones' | 'Diamantes' | 'Treboles' | 'Espadas';

// Este es el molde de como DEBE ser una Carta en tu juego
export interface CardData {
  valor: number; // del 2 al 14 (11=J, 12=Q, 13=K, 14=A)
  palo: Palo;
  seleccionada?: boolean; // El signo de interrogacion significa que es opcional (para el descarte)
}