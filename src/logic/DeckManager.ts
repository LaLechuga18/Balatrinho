import type { CardData, Palo } from '../types/gameType';

export class DeckManager {
  private deck: CardData[] = [];

  constructor() {
    this.crearMazo();
    this.mezclar();
  }

  // Genera las 52 cartas iterando sobre los 4 palos y los 13 valores
  private crearMazo(): void {
    const palos: Palo[] = ['Corazones', 'Diamantes', 'Treboles', 'Espadas'];
    this.deck = [];

    for (const palo of palos) {
      for (let valor = 2; valor <= 14; valor++) {
        this.deck.push({ valor, palo, seleccionada: false });
      }
    }
  }

  // Algoritmo Fisher-Yates para mezclar el arreglo aleatoriamente
  public mezclar(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; // Intercambio
    }
  }

  // Extrae y devuelve la cantidad solicitada de cartas de la parte superior
  public robar(cantidad: number): CardData[] {
    // splice corta las cartas del arreglo original para que ya no esten en el mazo
    return this.deck.splice(0, cantidad);
  }
  
  // Metodo de ayuda para saber cuantas cartas quedan
  public cartasRestantes(): number {
    return this.deck.length;
  }

  // Devuelve cuántas cartas quedan en el mazo agrupadas por palo
  public conteoMazo(): Record<Palo, number> {
    const conteo: Record<Palo, number> = {
      Corazones: 0,
      Diamantes: 0,
      Treboles: 0,
      Espadas: 0,
    };
    for (const carta of this.deck) {
      conteo[carta.palo]++;
    }
    return conteo;
  }
}