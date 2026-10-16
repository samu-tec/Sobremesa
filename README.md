# Sobremesa

Juegos de mesa para compartir con amigos desde el navegador. Incluye Ciudad Fortuna, Cambio de Color, Cuatro en Línea, Reversi, Tres en Raya y Dados al 100. Puedes crear una sala, compartir su código o jugar contra un bot, sin registrarte. La interfaz, reglas y partidas están disponibles en español e inglés.

**Dirección pública prevista:** [games.samuelciocan.com](https://games.samuelciocan.com). El proyecto se llama **Sobremesa**; `games.samuelciocan.com` es su dirección web.

## Probar la aplicación

Necesitas Node.js 22.13 o superior y pnpm 12.10.1.

Desde la carpeta del proyecto:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre **http://127.0.0.1:5173** y espera a que aparezca «Listo para jugar». El comando inicia la web, el servidor y la compilación de las reglas. Para detenerlos, pulsa `Ctrl+C` en esa terminal.

En local no necesitas Docker, Cloudflare ni crear un archivo `.env`: la configuración predeterminada sirve para probarlo. Si todavía no tienes pnpm y tu instalación de Node incluye Corepack:

```sh
corepack enable
corepack prepare pnpm@12.10.1 --activate
```

Para comprobar una partida entre dos personas en el mismo equipo, abre la web en una ventana normal y otra privada, crea una sala y entra con su código desde la segunda ventana. También puedes usar dos navegadores distintos.

La [guía de pruebas](docs/TESTING.md) explica qué revisar en cada juego, cómo comprobar la reconexión y cómo probar tamaños de móvil.

## Estructura

```text
apps/
  sobremesa-client/    Interfaz, idiomas, componentes y conexión con las salas
  sobremesa-server/    Servidor HTTP, sesiones y partidas multijugador
packages/
  sobremesa-logic/     Reglas, tipos y bots de los seis juegos
    src/games/         Un directorio por juego
    test/              Pruebas de los motores
tests/                Pruebas de integración y navegador
docs/                 Decisiones, desarrollo, pruebas y despliegue
```

Los tres paquetes comparten tipos mediante pnpm workspaces. Las reglas se ejecutan en el servidor y la interfaz recibe el estado que corresponde a cada jugador.

Los archivos de configuración de la raíz tienen estas funciones:

| Archivo                                             | Para qué sirve                                                               |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| `package.json`                                      | Dependencias, comandos y configuración de Prettier                           |
| `pnpm-workspace.yaml`                               | Agrupa los paquetes del proyecto y permite compilar esbuild                  |
| `pnpm-lock.yaml`                                    | Fija las versiones instaladas para que todos usen las mismas                 |
| `tsconfig.json`                                     | Configuración común de TypeScript; cada paquete tiene sus ajustes            |
| `playwright.config.ts`                              | Navegador y servidor temporal para las pruebas automáticas                   |
| `.gitignore`                                        | Excluye dependencias, compilaciones, secretos y resultados de pruebas de Git |
| `.gitattributes`                                    | Mantiene el tratamiento de archivos de texto consistente entre sistemas      |
| `.env.example`                                      | Ejemplo de opciones del servidor, sin credenciales                           |
| `Dockerfile`, `docker-compose.yml`, `.dockerignore` | Construcción y ejecución con Docker                                          |

`node_modules/` contiene las dependencias instaladas y `dist/` los resultados de compilación. Son directorios generados. Los resultados de las pruebas quedan en `tests/.output/` y tampoco se guardan en Git.

## Comandos

| Comando                 | Uso                                                      |
| ----------------------- | -------------------------------------------------------- |
| `pnpm dev`              | Desarrollar y probar en el puerto 5173                   |
| `pnpm build`            | Compilar los tres paquetes                               |
| `pnpm start`            | Servir la aplicación compilada en el puerto 3000         |
| `pnpm test:i18n`        | Verificar traducciones y parámetros                      |
| `pnpm test`             | Probar las reglas y los bots                             |
| `pnpm test:integration` | Probar sesiones y permisos con un servidor temporal      |
| `pnpm test:e2e`         | Probar la interfaz con un navegador                      |
| `pnpm check`            | Comprobar formato, compilar y ejecutar todas las pruebas |
| `pnpm format`           | Dar formato al código con Prettier                       |

Las pruebas de integración y navegador necesitan que hayas ejecutado `pnpm build`. Las de navegador usan Google Chrome instalado; hay una alternativa con Chromium en la [guía de pruebas](docs/TESTING.md).

## Desarrollo y alojamiento

- [Decisiones del proyecto](docs/DECISIONS.md): arquitectura, estilo y reglas que conviene mantener.
- [Guía de desarrollo](docs/CONTRIBUTING.md): dónde añadir un juego y cómo integrarlo con la interfaz.
- [Pruebas](docs/TESTING.md): comprobaciones manuales y automáticas.
- [Despliegue](docs/DEPLOYMENT.md): Node, Docker y Cloudflare Tunnel para `games.samuelciocan.com`.

Las salas están en memoria: reiniciar el servidor termina las partidas. La reconexión permite recuperar el sitio durante cinco minutos por defecto mientras el servidor siga funcionando. Las invitaciones dejan de funcionar cuando se cierra o caduca la sala.
