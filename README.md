# 🎮 Multiplayer Gaming Platform — games.samuelciocan.com

Plataforma multijugador en tiempo real escalable, ultraligera y segura ante trampas (Server-Authoritative), diseñada con arquitectura de monorepo moderno en **pnpm**, **TypeScript**, **Node.js + Socket.IO** y **React + Vite + Tailwind CSS**.

---

## 🏛️ Estructura del Monorepo

```
.
├── apps/
│   ├── client/                  # Frontend: React 18, Vite, Tailwind CSS, Lucide
│   │   ├── src/
│   │   │   ├── components/      # Tableros interactivos (ColorClash, TicTacToe) y anuncios
│   │   │   ├── hooks/           # useGuestProfile (UUID persistente en localStorage)
│   │   │   ├── services/        # Web Audio API (procedural SFX), Socket.IO client
│   │   │   └── views/           # Vista 1: Lobby, Vista 2: Sala de Espera, Vista 3: Juego
│   │   ├── index.html           # Meta viewport mobile (touch-action, 100dvh)
│   │   ├── vite.config.ts       # Proxy WS / Socket.IO y servidor de desarrollo
│   │   └── package.json
│   └── server/                  # Backend: Node.js, Express, Socket.IO
│       ├── src/
│       │   ├── RoomManager.ts   # Salas con códigos de 5 caracteres, bots, reconexión
│       │   ├── socketHandlers.ts# Eventos Socket.IO fuertemente tipados
│       │   ├── server.ts        # Express HTTP + Socket.IO Server + Static serving
│       │   └── config.ts        # Variables de entorno y configuración
│       └── package.json
├── packages/
│   └── game-logic/              # Lógica de juego pura compartida (Zero runtime deps)
│       ├── src/
│       │   ├── engine/          # Interfaz IGameEngine (Patrón Plugin / Estrategia)
│       │   ├── events/          # Tipado estricto de eventos Socket.IO
│       │   ├── games/
│       │   │   ├── tictactoe/   # 3 en Raya: Motor + Bot Minimax
│       │   │   └── colorclash/  # Color Clash (108 cartas, turnos circulares, bot)
│       │   └── types/           # Tipos de salas, jugadores y lifecycle hooks
│       └── test/                # Tests unitarios de motores y sanitización
├── docs/
│   └── DECISIONS.md             # ADR: Arquitectura, Seguridad, Marcas y Monetización
├── Dockerfile                   # Construcción multi-stage ultra-ligera
├── docker-compose.yml           # Orquestación con servicio opcional Cloudflare Tunnel
├── pnpm-workspace.yaml          # Configuración de workspaces pnpm
├── package.json                 # Scripts raíz de desarrollo y compilación
└── tsconfig.json                # Configuración base estricta de TypeScript
```

---

## 🚀 Inicio Rápido en Desarrollo

### 1. Requisitos Previos
- Node.js >= 20
- pnpm >= 9 (o `corepack enable pnpm`)

### 2. Instalación y Ejecución
```bash
# 1. Instalar dependencias en todo el monorepo
pnpm install

# 2. Ejecutar tests unitarios de los motores de juego
pnpm test

# 3. Iniciar entorno de desarrollo interactivo (cliente y servidor concurrentes)
pnpm dev
```

El servidor estará escuchando en `http://localhost:3000` y el cliente en `http://localhost:5173`.

---

## 🕹️ Juegos Disponibles (Fase 1)

### 1. 3 en Raya (Tic-Tac-Toe)
- **Modos:** 1v1 Online o Local vs Bot (IA con algoritmo Minimax imbatible).
- **Mecánicas:** Tablero de 3x3, cálculo de turnos y líneas ganadoras con resaltado visual animado.

### 2. Color Clash (Mecánica tipo UNO® libre de infracción de marca)
- **Baraja:** 108 cartas distribuidas en 4 colores (`Rojo`, `Azul`, `Verde`, `Amarillo`), números (`0-9`), Cartas de Acción (`+2`, `Salto`, `Cambio de Sentido`) y Comodines (`Comodín`, `Comodín +4`).
- **Jugadores:** De 2 a 4 jugadores (combinando humanos y bots inteligentes).
- **IA de Bots:** Análisis heurístico que prioriza contrarrestar rivales con pocas cartas y selecciona el color óptimo al jugar comodines.
- **Server-Authoritative:** Sanitización estricta por jugador (`getSanitizedState`). Los rivales solo reciben `{ cardCount: number }`. El mazo y las cartas ajenas nunca se envían al cliente.

---

## 📱 Optimizaciones Mobile-First

- **CSS `100dvh`:** Evita saltos y solapamientos con la barra dinámica de navegación de iOS Safari y Chrome Android.
- **Touch Targets >= 48px:** Botones, casillas y cartas diseñados para interacción táctil cómoda y sin fallos.
- **`touch-action: manipulation`:** Elimina el retardo clásico de 300ms de doble toque en navegadores móviles.
- **Efectos de Sonido Procedurales:** Generados en tiempo real mediante la **Web Audio API** del navegador (cero dependencias de archivos MP3/WAV externos, latencia cero y sin riesgo de 404s).

---

## 🐳 Despliegue en Producción & Cloudflare Tunnels

### Modo Standalone
```bash
pnpm build
pnpm start
# Abre http://localhost:3000 (el backend sirve el frontend optimizado)
```

### Modo Docker
```bash
# Compilar y arrancar contenedor de producción
docker compose up -d game-server
```

### Exposición con Cloudflare Tunnels (`cloudflared`)
El archivo `docker-compose.yml` incluye un perfil listo para `cloudflared`:
```bash
# Exportar tu token de túnel obtenido en Cloudflare Zero Trust
export CLOUDFLARE_TUNNEL_TOKEN="tu-token-aqui"

# Arrancar la plataforma junto con el túnel
docker compose --profile tunnel up -d
```
Esto expondrá de forma segura `http://localhost:3000` en `games.samuelciocan.com` con SSL/TLS gestionado, protección DDoS y sin abrir puertos en el router.

---

## 📖 Documentación de Decisiones de Arquitectura
Consulta [`docs/DECISIONS.md`](file:///Users/samuel/Documents/Games/docs/DECISIONS.md) para detalles completos sobre:
- Modelo de seguridad Zero-Trust y sanitización de estado.
- Interfaz extensible `IGameEngine`.
- Mitigación legal respecto a marcas registradas.
- Estrategia de monetización (Guest UUID, JWT, Lifecycle hooks para anuncios).
