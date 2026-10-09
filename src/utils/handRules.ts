export interface HandTypeInfo {
  nombre: string;
  fichasBase: number;
  multBase: number;
}

export const TIPOS_DE_MANO: Record<string, HandTypeInfo> = {
  CARTA_ALTA:     { nombre: 'Carta Alta',        fichasBase:   5, multBase:  1 },
  PAREJA:         { nombre: 'Pareja',             fichasBase:  10, multBase:  2 },
  DOBLE_PAREJA:   { nombre: 'Doble Pareja',       fichasBase:  20, multBase:  2 },
  TRIO:           { nombre: 'Trío',               fichasBase:  30, multBase:  3 },
  ESCALERA:       { nombre: 'Escalera',           fichasBase:  30, multBase:  4 },
  COLOR:          { nombre: 'Color',              fichasBase:  35, multBase:  4 },
  FULL_HOUSE:     { nombre: 'Full House',         fichasBase:  40, multBase:  4 },
  POKER:          { nombre: 'Póker',              fichasBase:  60, multBase:  7 },
  ESCALERA_COLOR: { nombre: 'Escalera de Color',  fichasBase: 100, multBase:  8 },
  // Manos secretas (requieren 5+ cartas del mismo valor, ej. con cartas potenciadas)
  REPOKER:        { nombre: 'Repóker',            fichasBase: 120, multBase: 12 },
  FULL_DE_COLOR:  { nombre: 'Full de Color',      fichasBase: 140, multBase: 14 },
  POKER_DE_COLOR: { nombre: 'Póker de Color',     fichasBase: 160, multBase: 16 },
};