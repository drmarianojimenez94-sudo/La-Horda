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

- **Arena** (modo horda): 6 escenarios — Ruinas del Bosque, Arena Acuática, **La Fortaleza Sin
  Fin** (Arena III: mapa grande por sectores con puentes que se reconfiguran y trampas; ver
  `docs/arena-identity/fortaleza.md`), Arena de Hielo, Laberinto Maldito y Arena Infernal —,
  10 niveles cada uno, subjefes y jefe final por arena.
- **10 campeones**: Tanque, Asesino, Mago, Soporte, Segador Olvidado, Axiom, La Profeta,
  Musashi, Sylva (Cazadora del Bosque) y Nigromante, cada uno con 3 habilidades y ulti.
- **Arena Divina**: asedio 4v4 con torres, castillos, minions y campeones divinos.
- **Progresión persistente** en `localStorage`: niveles, oro, maestría de habilidades,
  árboles de talentos, objetos con rarezas/sets/fusión; exportación/importación por código.
- **Galería de campeones** y **tienda** (la tienda todavía es un stub marcado "en construcción").

## Estado del proyecto

Prototipo en desarrollo activo. Mejoras técnicas pendientes (no urgentes) en
[MODULARIZATION_FOLLOWUPS.md](MODULARIZATION_FOLLOWUPS.md).
