# Balatrinho 🃏

Videojuego de cartas competitivo por turnos: **póker + comodines + multiplicadores + supervivencia**.
Cada jugador arma la mejor mano posible, compra comodines con monedas y trata de aguantar más que los demás.

Está inspirado en juegos como Balatro, pero **no es una copia**: no usamos sus cartas, comodines, nombres, arte ni reglas específicas.

> Proyecto escolar en desarrollo. Hoy se puede jugar en modo un jugador; el modo online todavía no existe.

---

## Estado del proyecto

**Ya funciona**

- Baraja estándar de 52 cartas y reparto de 8 cartas por ronda
- Selección de hasta 5 cartas, descartes y evaluación de manos de póker (las 9 clásicas + 3 secretas)
- Sistema de rondas (máximo provisional de 10) con 4 manos y 3 descartes por ronda
- Puntuación con comodines equipados
- Tienda de comodines entre rondas, con monedas
- 3 comodines: El Rey, Maestro de Espadas y Comodín

**Todavía falta** (ver la lista completa en [Pendientes](#pendientes))

- Multijugador (online y en red local)
- Vidas, daño y eliminación entre jugadores
- Animaciones de cartas y fichas
- Más comodines y arte para ellos

---

## Cómo se juega (reglas actuales)

1. Al empezar cada ronda recibes **8 cartas**.
2. Puedes seleccionar **hasta 5 cartas** a la vez, ya sea para descartarlas o para jugarlas.
3. Tienes **3 descartes** por ronda. Cada descarte reemplaza las cartas que tengas seleccionadas (hasta 5).
4. Tienes **4 manos** por ronda. Al jugar una mano, solo se reponen las cartas usadas; el resto de tu mano se queda igual.
5. Cuando se acaban tus manos, termina la ronda y se abre la **tienda** para comprar comodines.
6. Puedes tener **máximo 3 comodines** equipados.

**Puntuación:**

```
puntaje = (fichas base de la mano + fichas de las cartas que puntúan + fichas de comodines)
          × (multiplicador de la mano + multiplicador de comodines)
```

> ⚠️ Todos los valores de balance (fichas, multiplicadores, costos, monedas) son **provisionales** y se van a ajustar con pruebas.

---

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) (probado con Node 22) y Git.

```bash
git clone https://github.com/LaLechuga18/Balatrinho.git
cd Balatrinho
npm install
npm run dev
```

Abre la dirección que te muestre la terminal (normalmente `http://localhost:5173`).

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Revisa los tipos con TypeScript y genera la versión de producción |
| `npm run lint` | Revisa el código con ESLint |
| `npm run preview` | Sirve la versión de producción para probarla |

---

## Estructura del proyecto

```
public/
├── frames/            # Imágenes de las cartas (palo_numero.png; el As es el 1)
└── jokers/            # Imágenes de los comodines (una por comodín)
src/
├── components/        # Piezas de interfaz (Card, Tienda, ComodinImagen)
├── logic/             # Lógica del juego, sin React
│   ├── DeckManager.ts     # Crea, mezcla y reparte la baraja
│   ├── HandEvaluator.ts   # Detecta la mano de póker y calcula el puntaje
│   └── Comodines.ts       # Catálogo de comodines y sus efectos
├── types/             # Tipos compartidos (CardData, Palo)
├── utils/             # Datos de apoyo (valores base de cada mano en handRules.ts)
├── App.tsx            # Pantalla principal y flujo de la partida
└── App.css            # Estilos generales
```

**Stack actual:** React 19 + TypeScript + Vite.
**Planeado:** Node.js + Socket.io para el multijugador, y GSAP o Framer Motion para las animaciones.

---

## Cómo agregar un comodín

Todo vive en `src/logic/Comodines.ts`. Agrega una entrada al arreglo `CATALOGO_COMODINES`:

```ts
{
  id: 'mi-comodin',
  nombre: 'Mi Comodín',
  descripcion: 'Cada As que puntúe otorga +30 fichas.',
  costo: 8,
  imagen: '/jokers/mi-comodin.png',   // opcional: si falta, se muestra un 🃏
  calcularEfecto: (cartasPuntuables) => {
    const ases = cartasPuntuables.filter((c) => c.valor === 14).length;
    return { fichasExtra: ases * 30, multExtra: 0 };
  },
},
```

Luego pon la imagen en `public/jokers/mi-comodin.png`. No hace falta tocar nada más: la tienda y el panel de comodines lo toman del catálogo.

---

## Cómo colaborar

### Primera vez

```bash
git clone https://github.com/LaLechuga18/Balatrinho.git
cd Balatrinho
npm install
```

### Flujo para cada cambio

```bash
git checkout main
git pull                              # trae lo último antes de empezar
git checkout -b feature/nombre-corto  # una rama por tarea
# ...haz tus cambios...
npm run lint && npm run build         # confirma que todo compila
git add -A
git commit -m "Describe lo que hiciste"
git push -u origin feature/nombre-corto
```

Después abre un **Pull Request** en GitHub hacia `main` y pide que alguien más lo revise antes de unirlo.

### Reglas del equipo

- **No hagas push directo a `main`**: siempre por rama y Pull Request.
- **Nunca uses `git push --force` sobre `main`.** Puede borrar el trabajo de los demás.
- **Avisa en qué archivo vas a trabajar.** `App.tsx` concentra mucho del flujo del juego y es el que más conflictos va a dar si dos personas lo editan a la vez.
- **Una tarea por rama.** Los cambios chicos y enfocados se revisan más rápido.
- Si tu rama se desactualiza: `git pull --rebase origin main`.

### Convenciones de código

- **Carpetas en inglés** (`components`, `logic`, `utils`, `types`, `jokers`). Los nombres del dominio dentro del código van **en español** (`mano`, `ronda`, `comodin`, `monedas`), como ya está en el proyecto.
- **Separa lógica de interfaz.** Lo que decide las reglas del juego va en `src/logic/` y no debe importar React; lo visual va en `src/components/`.
- **Los valores de balance son constantes con nombre** (por ejemplo `MAX_DESCARTES_POR_RONDA` al inicio de `App.tsx`), para poder ajustarlos sin buscar números sueltos.
- **No copies nada de Balatro**: ni nombres, ni arte, ni comodines, ni reglas específicas.
- Mantén el alcance chico. Primero un juego pequeño y completo, después más contenido.

---

## Pendientes

Si quieres tomar una tarea, avisa en el grupo y crea tu rama.

**Jugabilidad**
- [ ] Sistema de vidas (3 por jugador) y daño al final de cada ronda, según la comparación de puntajes
- [ ] Monedas reales: +8 al ganar la ronda y +3 al perderla (hoy es un valor provisional de +3 para todos)
- [ ] Comodines que faltan: El Apostador, Último Aliento, El Tramposo y Doble o Nada
- [ ] Mecánica de "Desafío" (apostar monedas a superar cierto puntaje). Opcional
- [ ] Eventos de ronda. Opcional

**Multijugador**
- [ ] Servidor con Node.js + Socket.io (salas, turnos y sincronización de estado)
- [ ] Un tipo `GameState` compartido entre cliente y servidor
- [ ] Modo online y modo en red local
- [ ] Barra superior de jugadores con datos reales (hoy es un mockup fijo)

**Visual**
- [ ] Animaciones: reparto de cartas, giro de carta, selección, fichas hacia el bote
- [ ] Arte de los comodines en `public/jokers/`
- [ ] Pantalla de fin de partida

**Decisiones abiertas**
- [ ] Modelo de puntuación: hoy usa *fichas × multiplicador* por cada mano. El documento de diseño plantea un valor base fijo por mano, con multiplicadores que vienen solo de los comodines. Hay que decidir cuál se queda.
- [ ] Balance general: costos de comodines, monedas por ronda, número de rondas
