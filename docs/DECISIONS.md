# Architecture Decision Records (ADR)
## Plataforma de Juegos Multijugador Escalable (games.samuelciocan.com)

**Fecha:** Octubre 2026  
**Estado:** Aprobado / En Producción  
**Autor:** Arquitecto de Software Senior & Lead Full-Stack TypeScript  

---

## 1. Elección del Stack Tecnológico

### Contexto
Se requiere construir una plataforma multijugador en tiempo real accesible desde navegadores web (móviles y escritorio) para el dominio `games.samuelciocan.com`. El sistema debe ser ligero, con baja latencia, fácil de desplegar y mantener, y con máxima coherencia en el tipado entre cliente y servidor.

### Decisiones
1. **Monorepo con pnpm Workspaces:**
   - **Motivo:** Permite compartir código fuente puro de modelos, validaciones y lógica de juegos (`packages/game-logic`) directamente entre el cliente (`apps/client`) y el servidor (`apps/server`) sin necesidad de publicar paquetes en un registro privado npm.
   - **Eficiencia:** `pnpm` utiliza enlaces duros (*hard links*) y almacenamiento direccionable por contenido, reduciendo el consumo de disco y acelerando drásticamente el tiempo de instalación frente a npm/yarn.

2. **TypeScript Estricto de Extremo a Extremo:**
   - Un único lenguaje en todo el stack. Cualquier cambio en la firma de eventos o en la estructura de los estados del juego se propaga de forma inmediata con errores en tiempo de compilación tanto en cliente como en servidor.

3. **Backend: Node.js + Express + Socket.IO:**
   - **Socket.IO:** Provee WebSockets bidireccionales de baja latencia con soporte nativo de salas (*rooms*), eventos tipados (`TypedServer`, `TypedSocket`), *heartbeats* automáticos y fallback a HTTP Long-Polling en redes corporativas o proxies restrictivos.
   - **Express:** Servidor HTTP minimalista para endpoints de salud (*healthchecks* `/health`), métricas y posible API REST futura (usuarios, rankings, pagos).

4. **Frontend: React + Vite + Tailwind CSS:**
   - **Vite:** HMR (*Hot Module Replacement*) instantáneo en desarrollo y empaquetado optimizado mediante Rollup/esbuild en producción.
   - **Tailwind CSS:** Diseño utilitario mobile-first con soporte para tokens de diseño dinámicos, minimizando el CSS final a unos pocos kilobytes tras el purgado.

---

## 2. Modelo de Seguridad: Arquitectura Server-Authoritative y Sanitización

### Contexto
En juegos de mesa y cartas con información oculta (como Color Clash / cartas en mano, mazo de robo), confiar en el cliente (*client-side authority*) es una vulnerabilidad crítica: cualquier usuario con las DevTools del navegador podría inspeccionar la memoria o el WebSocket y ver las cartas del rival o la próxima carta del mazo.

### Decisión
1. **Autoridad Absoluta del Servidor:**
   - El cliente solo envía **intenciones de acción** (`PlayerAction`), por ejemplo: `{ type: 'PLAY_CARD', cardId: 'c12', chosenColor: 'red' }`.
   - El servidor valida la legalidad de la acción mediante `IGameEngine.validateAction(state, playerId, action)`.
   - Si la acción es inválida, se rechaza silenciosamente o se emite un error; el estado del juego nunca muta.
   - Si la acción es válida, el servidor computa el nuevo estado inmutable mediante `applyAction(state, playerId, action)`.

2. **Pipeline de Sanitización Per-Player (`getSanitizedState`):**
   - El servidor nunca emite el objeto `GameState` completo por difusión (*broadcast*).
   - En su lugar, el servidor itera sobre cada jugador conectado en la sala y genera una proyección pública sanitizada específica para ese jugador:
     ```typescript
     for (const player of room.players) {
       const sanitizedState = engine.getSanitizedState(room.gameState, player.id);
       io.to(player.socketId).emit('game:state_update', sanitizedState);
     }
     ```
   - **Información Oculta Sanitizada en Color Clash:**
     - Mano de otros jugadores: Se transforman en `{ cardCount: number }`. Los arrays con las identidades de las cartas de los rivales se eliminan por completo de la carga útil del socket.
     - Mazo de robo (*drawPile*): Se proyecta únicamente como `drawPileCount: number`. Las cartas restantes y su orden no viajan por la red.
     - Historial y pila de descartes: La carta superior es pública, pero la baraja de robo permanece privada en el servidor.

---

## 3. Arquitectura del `RoomManager` y Abstracción `IGameEngine`

### Abstracción `IGameEngine` (Patrón Plugin / Estrategia)
Para permitir que cualquier juego nuevo (Ajedrez, Batalla Naval, etc.) se integre sin tocar la infraestructura de salas o de WebSockets, cada juego implementa la interfaz contractualmente obligatoria:

```typescript
export interface IGameEngine<GameState, PlayerAction, PublicState> {
  initGame(players: { id: string; isBot: boolean }[]): GameState;
  validateAction(state: GameState, playerId: string, action: PlayerAction): boolean;
  applyAction(state: GameState, playerId: string, action: PlayerAction): GameState;
  getSanitizedState(state: GameState, playerId: string): PublicState;
  checkWinner(state: GameState): string | null;
  getBotAction(state: GameState, botId: string): PlayerAction | null;
}
```

### Arquitectura de `RoomManager`
El `RoomManager` gestiona el ciclo de vida completo de las sesiones multijugador:
- **Códigos de Sala Amigables:** Códigos alfanuméricos únicos de 5 caracteres en mayúsculas (ej. `K9X2P`), fáciles de compartir en móviles sin ambigüedades (excluyendo caracteres confusos como `0`/`O`, `1`/`I`).
- **Tolerancia a Desconexiones y Reconexión Efímera:**
  - Los jugadores poseen un identificador de sesión permanente (`playerId` UUID generado en el cliente y persistido en `localStorage`).
  - Si un socket se desconecta repentinamente (ej. cambio de red Wi-Fi a datos 4G/5G en el móvil), el jugador no es expulsado de inmediato; se marca como `connected: false` y se inicia una ventana de gracia configurable (ej. 30-45 segundos).
  - Al reconectarse con el mismo `playerId` y `roomCode`, el `socketId` se actualiza, la sala emite una sincronización completa del estado sanitizado y la partida continúa sin interrupción.
- **Gestión Automatizada de Bots:**
  - El servidor programa turnos de bots con un retraso humano simulado (400ms a 1000ms) para evitar jugadas instantáneas no realistas.
  - El motor evalúa `getBotAction(state, botId)` de forma determinista y segura.
- **Limpieza de Recursos (Garbage Collection):**
  - Salas vacías o inactivas tras el temporizador de gracia se destruyen automáticamente liberando memoria RAM.

---

## 4. Aspectos Legales de Marcas y Estrategia de Monetización

### Aspectos Legales de Marcas: "Color Clash" vs "UNO®" y "Capital Clash" vs "Monopoly®"
- **Riesgo:** "UNO" es una marca registrada de Mattel, Inc., y "Monopoly" es una marca registrada de Hasbro, Inc. El uso de sus nombres comerciales, logotipos o activos gráficos propietarios puede suscitar reclamaciones de infracción de marca (*trademark*) o derechos de autor (*copyright*).
- **Protección Legal:**
  - Bajo la doctrina internacional y jurisprudencia del Tribunal Supremo de EE. UU. (*Baker v. Selden*) y directivas de la UE, las **reglas y mecánicas puras de juego** (rodar dados, avanzar casillas, comprar terrenos, cobrar alquileres, turnos circulares) no son sujetas a derechos de autor. Solo lo son los textos literarios, logotipos y expresión artística específica.
  - Por ello, nuestros juegos utilizan marcas originales: **Color Clash** y **Capital Clash**.
  - **Capital Clash** implementa nombres de calles emblemáticas y vías públicas españolas de dominio público (ej. Gran Vía, Puerta del Sol, Alcalá), diseño visual contemporáneo con paleta original, y tarjetas de suerte/comunidad redactadas desde cero.

### Arquitectura de Reglas Personalizables por el Anfitrión
- El sistema permite al host ajustar parámetros antes de iniciar la partida mediante el evento WebSocket `room:update_rules`:
  - **Dinero Inicial:** 1000€, 1500€ (estándar), 2000€, 2500€.
  - **Salario de la Salida:** 200€ (estándar), 300€, 400€.
  - **Regla de la Casa: Bote de Parking Gratuito:** Impuestos y multas se acumulan en el bote central y quien caiga en la casilla se lo lleva.
  - **Doble en Salida:** Si el jugador aterriza exactamente en la casilla 0 (SALIDA), cobra el doble de sueldo.
  - **Subastas:** Opción de subastar o pasar fincas no adquiridas.
- **Autoridad Total del Servidor en Dados y Transacciones:**
  - Las tiradas de dados (`die1`, `die2`) se generan exclusivamente en el servidor mediante el motor `MonopolyEngine`. El cliente jamás decide el resultado ni la distancia recorrida.
  - La regla de edificación equitativa (*even building rule*), pago de alquileres, hipotecas y contratos de compraventa/intercambio (*trades*) son validados y ejecutados transaccionalmente en memoria sin confiar en el cliente.

### Estrategia de Monetización y Escalabilidad Futura
1. **Identidad de Usuarios (Guest-First a JWT):**
   - Sistema *zero-friction*: el usuario entra de inmediato con un identificador de invitado (`Guest UUID`) y un apodo personalizable.
   - La arquitectura desacopla el `playerId` del mecanismo de transporte, permitiendo en una fase posterior enlazar este `playerId` a cuentas OAuth / JWT (Google, Discord, etc.) manteniendo historial y estadísticas.
2. **Puntos de Intercepción en el Ciclo de Vida (`Lifecycle Hooks`):**
   - `onGameStart`: Registro de métricas y punto de activación para anuncios de banner o intersticiales.
   - `onGameEnd`: Disparador para pantallas de victoria con opciones de doble recompensa / anuncios recompensados (*Rewarded Ads*) o enlaces a suscripciones premium sin publicidad.
3. **Despliegue y Red (Cloudflare Tunnels):**
   - El backend expone su puerto `3000` de forma segura mediante `cloudflared`, evitando la necesidad de abrir puertos públicos en el firewall o exponer IPs de origen.
   - Soporte automático para SSL/TLS, compresión gzip/brotli y protección contra ataques DDoS al nivel de borde de Cloudflare.
