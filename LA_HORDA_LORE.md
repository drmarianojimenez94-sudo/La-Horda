# LA HORDA — Lore (canon del juego)

> Documento de referencia para texto, diálogos, arte y diseño de jefes. Si algo del juego contradice
> esto, manda este documento (o se actualiza acá primero).

## 1. La premisa en tres líneas
1. Hace siglos, **Cuatro Guardianes** sostenían el sello que mantenía a **la Horda** a raya.
2. La Horda no se puede matar: **corrompe**. Uno por uno, los Guardianes se pudrieron por dentro y
   pasaron a servirla (o a servirse de ella).
3. **El Hechicero Supremo**, el cuarto Guardián, es el que te guía… porque necesita que vos derrotes a
   los otros tres y le juntes sus cristales. Con los cuatro, el poder entero de la Horda es suyo.

## 2. Los Cuatro Guardianes y sus cristales
Cada Guardián guarda un **cristal** con su parte del sello. Cuando lo vencés, el cristal queda libre y
va a vos (en el juego: vuela desde el Guardián caído hasta tu campeón, se guarda en la partida y se ve
en la pantalla previa).

| # | Guardián (antes) | Corrompido en | Dónde lo enfrentás | Cristal | Color |
|---|---|---|---|---|---|
| 1 | **La Madre Espora** — sanadora del bosque profundo, unía todo lo vivo con sus raíces | La colonia que infecta todo | Jefa del **Reino Micelial** | Cristal de Espora | verde bioluminiscente |
| 2 | **El Mago de Hielo** — detenía a la Horda congelando sus caminos | El frío que le congeló el alma; cae como Ángel Caído de Hielo | Jefe de la **Arena de Hielo** | Cristal de Escarcha | celeste hielo |
| 3 | **El Guardián del Laberinto** — cerraba los caminos por donde avanzaba la Horda | Se volvió parte de sus propios muros | Subjefe del **Laberinto** (nivel 6) | Cristal de Piedra | ámbar |
| 4 | **El Hechicero Supremo** — el más sabio de los cuatro | La ambición: no quiere contener a la Horda, quiere **ser** la Horda | Te guía en toda la campaña; subjefe en la **Infernal** (nivel 9) y **jefe final** | Cristal del Juicio | oro blanco |

> **Decisión pendiente (confirmar):** el cuarto Guardián quedó como **la Madre Espora** porque vos
> propusiste "podría ser la Madre Espora" y encaja: ya es jefa de arena, tiene 3 fases y es una
> "madre" corrompida. Si preferís otro (por ejemplo el Leviatán o el Caballero de la Fortaleza),
> cambia una línea en `js/systems/crystals.js` (`CRYSTAL_DEFS`) y este documento.

## 3. El arco del Hechicero (cómo se cuenta jugando)
- **Arenas 1–3 (Bosque, Acuática, Fortaleza):** mentor angelical, cálido, útil. Explica todo claro.
  Pantalla previa con alas de luz. Nada hace sospechar.
- **Arena 4 (Micelial):** primer cristal. Él dice "Guardalo bien: cuando llegue el momento, **yo te lo
  cuido**". Primera grieta.
- **Arenas 5–6 (Hielo, Laberinto):** "Ya tenés dos. Falta uno." / "Con el mío, los Cuatro estarían
  juntos otra vez". Cada vez más interesado en los cristales que en vos.
- **Arena 7 (Infernal), nivel 9:** se revela. Pelea como subjefe con sus propios poderes y **huye** al
  caer ("Todavía no").
- **Nivel 10 — el final:** te arranca los tres cristales (vuelan de tu campeón hacia él), se funde con
  su propio cristal y pelea con **todos los poderes**:
  1. **Ángel Corrompido** (forma 1): el Hechicero con alas oscuras; usa los poderes de los cuatro
     Guardianes (esporas, escarcha, piedra y juicio).
  2. **Golem de Cuerpos** (forma 2): la Horda le da un cuerpo hecho de sus víctimas.
  3. **Demonio Mayor — Forma Final** (forma 3): la Horda entera en un cuerpo; repite lo peor de todas
     las formas.
- **Epílogo (pendiente de escribir):** con el Hechicero caído, los cuatro cristales quedan en tus
  manos. ¿Rehacés el sello… o te convertís en el nuevo Guardián? (gancho para el modo MOBA/temporadas).

## 4. Reglas de tono
- El Hechicero habla **claro** (instrucciones concretas) y la sospecha va en **una frase al final**,
  nunca en el medio de una instrucción.
- Los Guardianes no son "monstruos": eran héroes. Sus textos de jefe deberían tener una línea de lo
  que fueron (pendiente: línea de muerte de cada Guardián, ej. Madre Espora: "Al fin… silencio").
- La Horda nunca habla. Es una fuerza, no un personaje.

## 5. Dónde vive en el código
- Cristales, premio, ceremonia, diálogos y fila de la pantalla previa: `js/systems/crystals.js`.
- Guardado: `save.crystals` (`js/storage/save.js`), se reinicia con la campaña.
- Premio: `killEnemy` (Guardián del Laberinto) y `finishBossVictory` (Mago de Hielo, Madre Espora).
- En cooperativo el premio viaja como evento (`crystalAward`), cada jugador lo guarda en su partida.
- Final: `js/arenas/infernal/inf-hechicero.js`.
- Test: `tools/items/t_crystals.js`.
