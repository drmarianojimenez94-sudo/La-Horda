# La Horda

ARPG de horda + Arena Divina (prototipo de MOBA 4v4), hecho en HTML5 / Canvas 2D puro
(JavaScript sin dependencias ni frameworks).

## Cómo jugarlo

No necesita instalación ni paso de "build": el navegador lee los archivos tal cual.

- **Publicado**: GitHub Pages sirve `index.html` directamente.
- **Local**: desde la carpeta del repo,
  ```bash
  python3 -m http.server 8000
  # y abrí http://localhost:8000
  ```
  También funciona abriendo `index.html` con doble clic.
- **Preview de un commit** (para probar desde el iPhone antes de mergear):
  `https://rawcdn.githack.com/drmarianojimenez94-sudo/La-Horda/<commit>/index.html`

El juego es **horizontal**: en el teléfono en vertical muestra un aviso para girarlo.

## Estructura

```
index.html        esqueleto HTML de las pantallas + lista de estilos y scripts (en orden)
css/              estilos (base, menús, HUD, paneles, overlays)
js/               código del juego separado por sistema (datos, dibujo, combate, campeones,
                  arenas, IA, UI...). js/main.js arranca el juego.
assets/           arte en PNG: sprites de campeones, enemigos, jefes, arenas, efectos e íconos
tools/regression/ batería de pruebas automáticas (herramienta de desarrollo, no es parte del juego)
docs/             informes técnicos
```

**Dónde está cada cosa, cómo agregar campeones/enemigos/habilidades/arenas/sprites y dónde
tocar el balance: ver [ARCHITECTURE.md](ARCHITECTURE.md).**

## Contenido actual

- **Arena** (modo horda): campaña de 10 arenas en orden — 01 Ciudad Maldita · 02 Fábrica Sin Fin ·
  03 Ruinas Célticas · 04 Reino Fúngico · 05 Arena Gélida · 06 Arena Acuática · 07 Laberinto · 08 Abismo ·
  09 **Minas Profundas** (la luz es territorio; matar a Cerbero abre el Portal Infernal y hay que
  atravesarlo; ver `docs/arena-identity/minas.md`) · 10 Arena Infernal —, 10 niveles cada una, subjefes y
  jefe final por arena. Fichas en `docs/arena-identity/`.
- **Jefes con REGLA propia**: cada jefe final tiene una mecánica que hay que resolver (red de núcleos,
  paredes agrietadas, tentáculos, Gran Helada, Convergencia…) con ventana EXPUESTO, anti-kite y anti-facetank.
  Ver [LA_HORDA_BOSS_IDENTITY.md](LA_HORDA_BOSS_IDENTITY.md) (matriz y exploits) y
  [LA_HORDA_BOSS_ASSET_MANIFEST.md](LA_HORDA_BOSS_ASSET_MANIFEST.md); pruebas en `tools/bosses/boss_rules.js`.
- **12 guardianes**: Tanque, Asesino, Mago, Soporte, Segador Olvidado, Axiom, La Profeta,
  Musashi, La Cazadora, Nigromante, El Libertador y Eren, cada uno con 3 habilidades y ulti.
  Un perfil nuevo elige **un guardián de regalo**; los demás se compran en la Tienda.
- **Arena Divina**: asedio 4v4 con torres, castillos, minions y campeones divinos.
- **Progresión persistente** en `localStorage`: niveles, oro, maestría de habilidades,
  árboles de talentos, objetos con rarezas/sets/fusión; exportación/importación por código.
- **Códice** (guardianes, bestiario, jefes y arenas) y **Tienda** (guardianes, objetos/sets y skins;
  precio por rareza; guardianes a 2.500; Míticos y Únicos no se venden; un perfil nuevo recibe 10.000 de oro una vez).
- **Cooperativo online** de hasta 4 guardianes (sala con código de 6 letras; relay en `server/`).

## Carga de imágenes

- **Dos tandas** (`js/assets/lazy-images.js` + `js/assets/preload.js`): primero lo que se ve en título,
  menús, Sala y guardianes (~11 MB); el arte de las arenas y los efectos (~28 MB) baja mientras se
  navegan los menús. La partida espera a que esté todo ("Preparando la arena… N %"): nunca se juega con
  arte a medio cargar.
- **WebP sin pérdida**: `python3 tools/art/webp_convert.py` genera una copia `.webp` (mismos píxeles) de
  cada PNG del manifiesto y la lista `js/assets/asset-webp.js`. **Si agregás o cambiás una imagen, volvé a
  correrlo** (si no, se usa el PNG, que también funciona).
- Medición con red 4G simulada: `node tools/audit/loadtime.js` (título: 52,5 s → 13,9 s).

## Servidor del multijugador

`server/relay.js`, desplegado en Render con `render.yaml`. Acepta conexiones del juego publicado
(GitHub Pages) y de las previews. En el plan gratuito se duerme: el juego lo despierta al abrir y, al
crear o unirse, reintenta solo hasta ~100 s mostrando "Despertando el servidor… N s". Si el servidor
rechaza la conexión, la Sala muestra el motivo. Prueba: `node tools/net-test/coldstart.js`.

**Verificación del juego publicado:** el workflow `Live check` (`.github/workflows/live-check.yml`) corre
una vez por día y a mano desde la pestaña Actions. Despierta el relay de Render, crea una sala y se une
con el código (`tools/net-test/live_relay.js`), hace el flujo de la Sala con dos iPhone emulados contra
GitHub Pages y mide la carga en 4G.

## Pruebas de celular y fluidez

- `node tools/audit/ui_layout.js`: 43 pantallas en iPhone 14 y SE apaisados (botones de menos de 40 px,
  textos chicos, cosas fuera de pantalla). Los ajustes para celular están en `css/mobile.css`.
- `node tools/audit/fps.js [arena] [cpu]`: fluidez. Si el juego va lento, la resolución interna baja sola
  (75 % / 60 %; `js/core/canvas.js`); `?res=0.75` la fija para probar.

## Modo desarrollador

Los regalos de prueba (todos los guardianes en nivel 90, todas las arenas y todas las skins) **solo** se
dan con `?dev=1` en la URL (queda recordado en ese navegador; `?dev=0` lo apaga). Un perfil nuevo sin
ese parámetro juega la campaña real. `?dev=1` también muestra el botón de red "B1" y el generador de
objetos de prueba de la Sala; `?debug=1` abre solo el panel de red.

## Estado del proyecto

Prototipo en desarrollo activo. Mejoras técnicas pendientes (no urgentes) en
[MODULARIZATION_FOLLOWUPS.md](MODULARIZATION_FOLLOWUPS.md).

## Myla y referencia de balance

Myla, la Maga del Yogur, incorpora Torre de Yogur, Yogurazo, Burbuja Cremosa y **BERRINCHE**: transformación en pañales, ondas de llanto y yogur en área. Incluye sprites direccionales, talentos, set Merienda Mágica y sincronización cooperativa. Las skins de los nuevos portadores tienen paletas propias, aura y efectos cosméticos.

Estadísticas, resultados de 57 simulaciones, ajustes y comandos de verificación: [BALANCE_CAMPEONES.md](BALANCE_CAMPEONES.md).

## Revisión de legibilidad de combate y HUD

La revisión de los 18 campeones conserva sus roles y movilidad, refuerza efectos desde
talento inicial y separa visualmente todos los controles del escenario. Detalles, límites de
balance y pruebas: [auditoría de combate y HUD](docs/vfx/AUDITORIA_COMBATE_HUD.md).

### Dos héroes e interfaz de preparación

La intro llega al menú. En campaña y Horda Infinita cada jugador elige dos héroes: al caer el primero entra la reserva automáticamente; al agotarlos queda fuera. Las cartas muestran las habilidades y el nivel; equipo, talentos y aliados se despliegan bajo opciones avanzadas. Los siete héroes recientes tienen refuerzos propios, y Normal reduce los picos de Bosque y Hielo.

El panel de niveles se habilita en Opciones para las cuentas incluidas en `ADMIN_USERS` del servidor. [Auditoría, pruebas, evaluación y configuración](docs/ux/AUDITORIA_ALPHA_02.md).

## Alpha: producción y Game Master

La entrega de la fábrica de producción, Códice/colección, entrenamiento y operaciones está documentada en [LA_HORDA_ALPHA_AUTONOMOUS_AUDIT.md](LA_HORDA_ALPHA_AUTONOMOUS_AUDIT.md), con gates ejecutados y pendientes explícitos. Estándares: [Production Bibles](docs/production/PRODUCTION_BIBLES.md). Incorporación de campeones: [Factory](tools/factory/README.md). Configuración del owner, contratos y respaldos: [Game Master](docs/production/operations.md). No hay pagos activos.
