import type { CardData } from '../types/gameType';

export class PokerEvaluator {
  public static evaluar(mano: CardData[]): string {
    const cantidad = mano.length;
    if (cantidad === 0) return "Sin cartas";

    // 1. Agrupar cartas por valor y por palo
    const cartasPorValor: Record<number, CardData[]> = {};
    const cartasPorPalo: Record<string, CardData[]> = {};

    mano.forEach(carta => {
      if (!cartasPorValor[carta.valor]) cartasPorValor[carta.valor] = [];
      cartasPorValor[carta.valor].push(carta);

      if (!cartasPorPalo[carta.palo]) cartasPorPalo[carta.palo] = [];
      cartasPorPalo[carta.palo].push(carta);
    });

    // 2. Ordenar grupos de mayor a menor repetición
    const gruposValores = Object.values(cartasPorValor).sort((a, b) => b.length - a.length || b[0].valor - a[0].valor);
    const repeticiones = gruposValores.map(grupo => grupo.length);

    // 3. Validar Color (Flush): Al menos 5 cartas del MISMO PALO EXACTO
    const hayColor = Object.values(cartasPorPalo).some(grupo => grupo.length >= 5);

    // 4. Validar Escalera (Straight)
    const verificarEscalera = (): boolean => {
      if (cantidad < 5) return false;
      const valores = [...new Set(mano.map(c => c.valor))].sort((a, b) => b - a);
      if (valores.includes(14)) valores.push(1); // El As (14) puede actuar como 1
      
      let consecutivas = 1;
      for (let i = 0; i < valores.length - 1; i++) {
        if (valores[i] - 1 === valores[i + 1]) {
          consecutivas++;
          if (consecutivas >= 5) return true;
        } else {
          consecutivas = 1;
        }
      }
      return false;
    };

    const hayEscalera = verificarEscalera();

    // ==========================================
    // 5. EVALUACIÓN ESTRICTA (De mayor a menor valor)
    // ==========================================
    
    // Manos Secretas (Balatro)
    if (repeticiones[0] >= 5 && hayColor) return "Póker de Color"; // Flush Five
    if (repeticiones[0] >= 5) return "Repóker"; // Five of a Kind
    if (repeticiones[0] >= 3 && repeticiones[1] >= 2 && hayColor) return "Full de Color"; // Flush House
    
    // Manos Estándar
    if (hayEscalera && hayColor) return "Escalera de Color";
    if (repeticiones[0] >= 4) return "Póker";
    if (repeticiones[0] >= 3 && repeticiones[1] >= 2) return "Full House";
    
    // Aquí está nuestro Color. Si hayColor es true, NUNCA bajará a revisar los pares.
    if (hayColor) return "Color"; 
    
    if (hayEscalera) return "Escalera";
    if (repeticiones[0] === 3) return "Trío";
    if (repeticiones[0] === 2 && repeticiones[1] >= 2) return "Doble Pareja";
    if (repeticiones[0] === 2) return "Pareja";

    return "Carta Alta";
  }
}