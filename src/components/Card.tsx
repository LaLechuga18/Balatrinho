import type { CardData } from '../types/gameType';

interface CardProps {
  data: CardData;
  onClick: () => void;
}

export function Card({ data, onClick }: CardProps) {
  // 1. Ajustamos el valor: Si el motor dice 14 (As), buscamos la imagen 1.
  const numeroImagen = data.valor === 14 ? 1 : data.valor;

  // 2. Convertimos el palo a minúsculas ("Corazones" -> "corazones")
  const nombrePalo = data.palo.toLowerCase();

  // 3. Construimos la ruta exacta apuntando a tu nueva carpeta
  const rutaImagen = `/frames/${nombrePalo}_${numeroImagen}.png`;

  return (
    <div 
      className={`carta-base ${data.seleccionada ? 'carta-seleccionada' : ''}`} 
      onClick={onClick}
      style={{
        // Aplicamos la imagen individual
        backgroundImage: `url('${rutaImagen}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    />
  );
}