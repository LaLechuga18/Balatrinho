import { useState } from 'react';
import type { Comodin } from '../logic/jokers';

interface ComodinImagenProps {
  comodin: Comodin;
  ancho?: number;
  alto?: number;
}

// Recuadro con la imagen del joker. Si el comodín no tiene imagen, o el archivo
// todavía no existe en public/jokers/, muestra un recuadro provisional con un 🃏.
export function ComodinImagen({ comodin, ancho = 64, alto = 90 }: ComodinImagenProps) {
  const [imagenFallo, setImagenFallo] = useState(false);
  const mostrarImagen = Boolean(comodin.imagen) && !imagenFallo;

  return (
    <div
      style={{
        width: ancho,
        height: alto,
        flexShrink: 0,
        border: '2px solid #ff77ff',
        borderRadius: '4px',
        background: '#120622',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {mostrarImagen ? (
        <img
          src={comodin.imagen}
          alt={comodin.nombre}
          onError={() => setImagenFallo(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated', // mantiene nítido el pixel art
          }}
        />
      ) : (
        <span style={{ fontSize: ancho * 0.5 }}>🃏</span>
      )}
    </div>
  );
}