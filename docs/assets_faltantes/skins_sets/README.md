# Assets faltantes — Skins de set

Una skin se activa SOLO con el set completo (regla canónica: Set verde = sinergias + skin al completarlo; aura ≠ skin). Hoy **ninguna skin existe**: `SET_SKINS` está vacío y con el set completo se ve el aura plena.

## Regla de producción (importante)

- ChatGPT no recuerda la imagen anterior: **no se puede pedir "el frame que falta"**. Cada pedido es la **hoja completa** del campeón con el set puesto, con TODAS sus animaciones, adjuntando su atlas canon como referencia.
- Una hoja incompleta o que cambie el personaje (cara, cuerpo, arma, proporciones) se rechaza entera: no se mezclan frames de dos hojas (regla NO FRANKENSTEIN).
- La referencia es siempre el **atlas CANON** del campeón registrado en `LA_HORDA_SPRITE_CANON.md`. Si el canon de un campeón cambia, la skin se pide sobre el canon nuevo (nunca sobre un arte descartado).
- Formato: el mismo layout que el atlas canon del campeón (mismas filas, mismos cuadros por fila, pies en la misma línea). Así la integración es cambiar la imagen del atlas al completar el set.

## Contenido

- **Sets de campeón (12):** una ficha por set, lista para pedir:

  - [`baluarte_tanque.md`](baluarte_tanque.md) — Baluarte Inquebrantable (Tanque, 40 cuadros)
  - [`nocturno_guerrero.md`](nocturno_guerrero.md) — Sombra Nocturna (Asesino, 40 cuadros)
  - [`convergencia_mago.md`](convergencia_mago.md) — Convergencia Elemental (Mago, 40 cuadros)
  - [`custodio_soporte.md`](custodio_soporte.md) — Bendición del Custodio (Soporte, 40 cuadros)
  - [`marea_segador.md`](marea_segador.md) — Marea Roja (Segador Olvidado, 40 cuadros)
  - [`sistema_axiom.md`](sistema_axiom.md) — Acceso Raíz (Axiom, 40 cuadros)
  - [`profecia_profeta.md`](profecia_profeta.md) — La Última Profecía (La Profeta, 40 cuadros)
  - [`errante_musashi.md`](errante_musashi.md) — El Rōnin Errante (Musashi, 40 cuadros)
  - [`manada_cazadora.md`](manada_cazadora.md) — La Manada (La Cazadora, 41 cuadros)
  - [`granadero_libertador.md`](granadero_libertador.md) — Uniforme del Granadero (El Libertador, 71 cuadros)
  - [`requiem_nigromante.md`](requiem_nigromante.md) — Réquiem del Señor de la Muerte (Nigromante, 45 cuadros)
  - [`legion_eren.md`](legion_eren.md) — Legión de Reconocimiento (Eren, 68 cuadros)

- **Sets universales (11):** [`universales.md`](universales.md) — matriz set × campeón (132 hojas) y plantilla.

## Totales

| Grupo | Hojas completas que faltan |
|---|---|
| Sets de campeón | 12 |
| Sets universales (todas las combinaciones) | 132 |
| Universales prioritarios (★) | 11 |
| **Mínimo recomendado para la alfa** | **12 + 11 = 23** |

## Integración cuando llegue una hoja

1. Guardar la hoja original en `art-source/skins/<set>_<campeón>.png`.
2. Recortar con el mismo layout del atlas canon → `assets/sprites/champions/<campeón>/skins/<set>/atlas.png`.
3. Registrar en `SET_SKINS` (js/systems/set-effects.js) y validar en partida (Artgate: tamaño, lectura, animación, orientación).
