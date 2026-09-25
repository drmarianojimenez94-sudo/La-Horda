# Batería de regresión (herramienta de desarrollo)

**No forma parte del juego** (el juego nunca carga nada de esta carpeta). Sirve para verificar,
de forma automática, que un cambio de código no altera el comportamiento: compara una versión
"ANTES" con una "DESPUÉS" corriendo exactamente las mismas partidas.

## Qué prueba

- `t_snapshot.js` — congela el juego en el título y guarda el valor de **todas** las variables
  globales del juego (tablas de balance, código de cada función por hash, píxeles de cada
  imagen, CSS y DOM).
- `t_det.js` — **33 partidas deterministas** (RNG con semilla fija, reloj virtual, cuadros
  manuales): los 10 campeones en todas las arenas, jefes finales, Arena Divina, Nigromante,
  muerte, subida de nivel con refuerzos, revivir, objetos, talentos y guardado. Registra estado
  cada 30 cuadros y un hash de los píxeles del canvas. Dos versiones con el mismo
  comportamiento dan trazas idénticas.
- `t_func.js` — ~95 chequeos de UI real en tiempo real: navegación por menús, las 5 arenas por
  la interfaz, pausa y pestañas, talentos, inventario, muerte y reintento, cambios de arena,
  saves corruptos/viejos, persistencia, y iPhone emulado (vertical y horizontal con toques).

## Cómo usarla

Requisitos: Node + Playwright (Chromium) y Python 3.

```bash
# 1) armar dos sitios instrumentados (ANTES y DESPUÉS) dentro de una carpeta "sites"
git worktree add /tmp/antes <commit-anterior>
python3 tools/regression/build_site.py /tmp/antes sites/antes
python3 tools/regression/build_site.py .          sites/despues
# 2) servir la carpeta sites
(cd sites && python3 -m http.server 8750) &
# 3) correr las pruebas en ambos
cd tools/regression
for v in antes despues; do
  node t_snapshot.js $v ../../results/$v
  node t_det.js      $v ../../results/$v
  node t_func.js     $v ../../results/$v
done
# 4) comparar
python3 compare_snap.py ../../results/antes/snapshot.json ../../results/despues/snapshot.json
python3 compare_det.py  ../../results/antes/det.json      ../../results/despues/det.json
```

Variables opcionales: `CHROMIUM_PATH` (ejecutable de Chromium), `PLAYWRIGHT_MODULE` (ruta al
paquete playwright si no está instalado localmente), `REGRESSION_BASE_URL` (por defecto
`http://127.0.0.1:8750`).

`build_site.py` copia el sitio y le inyecta `pre.js` (semilla, reloj virtual, rastreo de
imágenes y errores) al principio y `hooks.js` (API de prueba `window.__T`) al final. La copia
instrumentada nunca se publica.
