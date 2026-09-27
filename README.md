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
  en la etapa de prueba todo cuesta 1.000 de oro y un perfil nuevo recibe 10.000 una vez).
- **Cooperativo online** de hasta 4 guardianes (sala con código de 6 letras; relay en `server/`).

## Modo desarrollador

Los regalos de prueba (todos los guardianes en nivel 90, todas las arenas y todas las skins) **solo** se
dan con `?dev=1` en la URL (queda recordado en ese navegador; `?dev=0` lo apaga). Un perfil nuevo sin
ese parámetro juega la campaña real. `?dev=1` también muestra el botón de red "B1" y el generador de
objetos de prueba de la Sala; `?debug=1` abre solo el panel de red.

## Estado del proyecto

Prototipo en desarrollo activo. Mejoras técnicas pendientes (no urgentes) en
[MODULARIZATION_FOLLOWUPS.md](MODULARIZATION_FOLLOWUPS.md).
