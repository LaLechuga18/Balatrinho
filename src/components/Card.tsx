import type { CSSProperties } from 'react';
import type { CardData } from '../types/gameType';

interface CardProps {
  data: CardData;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function Card({ data, onClick, className = '', style }: CardProps) {
  // 1. Ajustamos el valor: Si el motor dice 14 (As), buscamos la imagen 1.
  const numeroImagen = data.valor === 14 ? 1 : data.valor;

  // 2. Convertimos el palo a minúsculas ("Corazones" -> "corazones")
  const nombrePalo = data.palo.toLowerCase();

  // 3. Construimos la ruta exacta apuntando a la carpeta frames
  const rutaImagen = `/frames/${nombrePalo}_${numeroImagen}.png`;

  return (
    <div 
      className={`carta-base ${data.seleccionada ? 'carta-seleccionada' : ''} ${className}`} 
      onClick={onClick}
      style={{
        backgroundImage: `url('${rutaImagen}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    />
  );
}
