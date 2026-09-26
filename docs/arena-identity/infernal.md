# Arena Infernal

- **Lugar en la campaña:** 7ª (la final)
- **Roster:** Esqueleto → Zombi → Esqueleto H → Demonio Menor → Demonio Mago → Gólem
- **Subjefe:** Campeones de la horda (niveles 4, 7 y 9)
- **Jefe:** Demonio Mayor (regenera)
- **Peligro propio:** Ignición, habilidades más débiles, pozos de lava
- **Regla creciente:** Tierra Maldita
- **Código propio:** `spawnPoolFor`, `aidBuildInfernal`, `hazards.js`

Esta arena usa el camino de siempre del motor (bloques por arena dentro de los archivos comunes):
no se migró al registro `ARENA_DEFS` para no arriesgar su comportamiento. Desde Alpha 0.1 su
**identidad propia** vive en una **extensión** (`ARENA_EXT`, ver abajo) que solo agrega cosas encima
(nunca toca geometría, subjefes ni navegación). La regresión determinista (`tools/regression/t_det.js`)
ya no da igual que antes en esta arena **a propósito**: hay mecánicas nuevas. Si en el futuro se migra, basta con mover
sus bloques a `js/arenas/infernal/` y registrar los mismos ganchos que usa La Fortaleza.

## Identidad propia (Alpha 0.1) — `js/arenas/infernal/inf-fissures.js` · "¿mato o cierro?"

| Mecánica | Qué hace |
|---|---|
| **Fisuras** | Desde el nivel 2 se abren grietas en el piso (aviso de 1,7 s: temblor + grieta que se forma). Máximo 1 (niv. 2-3), 2 (4-6) o 3 (7+). Crecen en 3 etapas (15 s cada una). |
| **Portales** | 30/42/55 % de la aparición normal (según la etapa de la mayor) sale por las fisuras abiertas; las de etapa 2+ escupen un demonio propio cada 10 s (con tope de 34 enemigos vivos). La etapa 3 **erupciona** (aviso circular, 7 % de la vida media). |
| **Cerrar** | Acción contextual (✖): 2,6 / 3,2 / 3,8 s según la etapa. **Riesgo:** el calor quema al que cierra (1,2 % de la vida máx./s) y a mitad de camino la fisura **reacciona** y vomita 2-3 enemigos. Varios a la vez la cierran más rápido. Soltar pausa (el progreso decae de a poco). |
| **Sellarla** | Estalla: aturde 1,3 s y empuja a los enemigos en 230 u y deja una poción. |
| **Entre niveles** | Todas bajan una etapa (las chicas se apagan). Durante subjefes/jefe no se abren nuevas ni escupen (solo erupcionan). |
| **Hielo** | Una Nova de Escarcha (o el Cataclismo) sobre una fisura la enfría: +35 % del progreso para cerrarla. |

- **Bots:** van a cerrarlas (máximo 2 por fisura) si no hay más de 3 enemigos alrededor (6 si son tanque/soporte) y tienen más del 45 % de vida; no se quedan en la boca de una fisura de etapa 3.
- **Red:** host-autoritativo (`infNetState()`); el invitado mantiene el botón y el anfitrión lleva el progreso.
- **Pruebas:** `INF.*`, `ENV.nova_de_escarcha_enfria_la_fisura` (`t_identity.js`) y `ARENA=infernal t_identity_net.js`.
- **Divergencia con el documento de diseño (anotada, no cambiada):** el documento pone al Hechicero → Demonio de la Horda como jefe final; hoy el jefe es el Demonio Mayor. El reemplazo depende de arte y lore que no existen todavía (ver `LA_HORDA_MISSING_ASSETS.md`).
