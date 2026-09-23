# La Horda

ARPG de horda + Arena Divina (prototipo de MOBA 4v4), hecho en HTML5 / Canvas 2D puro
(JavaScript, sin dependencias externas, un solo archivo autocontenido).

## Cómo jugarlo

No necesita instalación ni servidor: es un solo archivo HTML autocontenido.

- **Abrilo directo**: hacé doble clic en `index.html` y se abre en el navegador.
- **O con un servidor local** (recomendado si el navegador bloquea `file://` para
  algo puntual, como guardado local):
  ```bash
  python3 -m http.server 8000
  # despues abrí http://localhost:8000 en el navegador
  ```

## Estructura

```
la-horda/
├── index.html   # el juego completo: HTML + CSS + JS + arte embebido en base64
└── README.md
```

Todo el arte (sprites, efectos) está embebido como `data:image/png;base64,...` dentro
del mismo archivo, para que sea un único artefacto portable sin carpetas de assets
sueltas. Por eso el archivo pesa varios MB.

## Contenido actual

- **Arena** (modo de horda): 4 escenarios (Bosque, Hielo, Laberinto, Infernal), 10
  niveles cada uno, subjefes y jefe final por arena.
- **6 campeones jugables**: Tanque, Guerrero, Mago, Soporte, Segador Olvidado
  (Berserker) y Axiom (mago de área/control, con sus 4 habilidades: Error 404,
  Sobrescribir, Bug de Colisión y la definitiva Force Quit).
- **Arena Divina**: desbloqueada al completar las 4 arenas normales — asedio 4v4
  con torres, castillos, muerte definitiva e IA de equipo (ataque/defensa/retirada).
  Pensada como introducción a un futuro modo MOBA 4v4 separado.
- **Progresión persistente**: guardado en `localStorage` (oro, desbloqueos,
  maestría de habilidades por campeón), con exportación/restauración por código.
- **Galería de campeones** y **tienda** (la tienda todavía es un stub, marcado
  como "en construcción" en la interfaz).

## Estado del proyecto

Este es un prototipo en desarrollo activo. Algunas partes están deliberadamente
incompletas y marcadas como tales en la propia interfaz (por ejemplo, la tienda).
No hay build ni bundler: todo el código vive directamente en `index.html`, así que
cualquier editor de texto alcanza para trabajar en él.
