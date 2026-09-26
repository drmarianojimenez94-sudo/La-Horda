# LA HORDA — Auditoría de SETS (solo objetos de set)

Alcance: los 12 **sets de campeón** (4 piezas, `js/data/champion-sets.js` + `js/systems/champion-sets.js`) y los 11 **sets universales** (`js/data/sets.js`, Set de Lucifer en `js/data/items.js`, comportamiento en `js/systems/set-effects.js`).
Método: lectura de cada umbral contra el código y una prueba automática nueva, `tools/items/t_sets.js`: **55 chequeos, 0 fallas**. Dispara cada bonus de verdad (no alcanza con que figure en el texto) y además valida las reglas de equipo y de skin.

## 1. ¿Se aplican todas las pasivas?

**Sí, todas, después de un arreglo.** La única diferencia entre texto y efecto estaba en el Set de Lucifer.

### Sets de campeón

| Set (campeón) | 2 piezas | 3 piezas | 4 piezas | Skin |
|---|---|---|---|---|
| Baluarte (Tanque) | ✅ +15% vida | ✅ habilidades aturden/empujan | ✅ pisotón cada 3er básico | ❌ falta hoja |
| Sombra Nocturna (Asesino) | ✅ +8% crítico | ✅ crítico asegurado contra sangrantes | ✅ sigilo + reinicia Triple Golpe | ✅ Jack el Destripador |
| Convergencia (Mago) | ✅ +10% daño de habilidades | ✅ cambio de elemento +25% | ✅ estallido fuego+hielo+rayo | ✅ Ángel Arcano |
| Custodio (Soporte) | ✅ +12% curación | ✅ Bendición/Escudo curan en el tiempo | ✅ Ángel Guardián | ✅ Ángel del Alba |
| Marea Roja (Segador) | ✅ +20% Furia | ✅ básico sangra con +50% de Furia | ✅ cargas de Sangre + Tajo de la Muerte | ✅ Leónidas |
| Acceso Raíz (Axiom) | ✅ −8% enfriamiento | ✅ glitch del teletransporte | ✅ contagio + baja Error 404 | ✅ Skin Z |
| La Última Profecía (Profeta) | ✅ +12% curación | ✅ el Giro cura a los cercanos | ✅ salva de un golpe letal | ✅ Ángel Caído |
| El Rōnin Errante (Musashi) | ✅ +10% vel. de ataque | ✅ Paso Perfecto reinicia Corte | ✅ Iaijutsu | ✅ Samurái Legendario |
| La Manada (Cazadora) | ✅ +8% velocidad | ✅ trampa → Presa + crítico | ✅ Lobo Espectral + rebote | ✅ Flecha de Fuego |
| Granadero (Libertador) | ✅ +10% daño | ✅ el fusil aturde | ✅ recarga al matar | ❌ falta hoja |
| Réquiem (Nigromante) | ✅ +1 esqueleto | ✅ Pacto cura | ✅ Legión (−15% daño recibido) | ❌ falta hoja |
| Legión (Eren) | ✅ +15% Furia | ✅ gancho a 3+ baja el enfriamiento | ✅ titán +30% y cura por baja | ✅ Titán Bestia |

### Sets universales

Glaciar (2/3/4) ✅ · Coloso (2/3/4) ✅ · Sepulturero (2/3/4) ✅ · Tempestad (2/3/4) ✅ · Berserker (2/3/4) ✅ · Guardián (2/3/4) ✅ · Alba (2/3/4) ✅ · Cazador (2/3/4) ✅ · Arcano (2/3/4) ✅ · Laberinto (2/3/4) ✅ · Lucifer (2/3/4/6) ✅ con el arreglo de abajo.

### Arreglado en esta tanda

1. **Set de Lucifer, 4 piezas:** el texto dice que los golpes básicos aplican Quemadura, y la quemadura sí existe. Pero además sumaba un **35% de probabilidad de descarga eléctrica en cadena** que no figuraba en ningún texto. Se sacó.
2. **Set de Lucifer, 2 piezas:** decía "+8% daño de fuego (todas las habilidades)". En realidad suma a todas las habilidades, no solo a las de fuego, y ahora el texto dice eso: "+8% daño de habilidades".
3. **Skins en partidas en red:** cada invitado decidía la skin de los demás con **su propio** guardado, así que podía ver una skin que no correspondía, o no ver la que sí. Ahora decide el anfitrión, que conoce el equipo real de cada jugador. La skin viaja en el héroe (`skinSet`).
4. **El color de la skin en los efectos** viaja en los argumentos de los eventos de red, así que los invitados ven los efectos teñidos igual que el anfitrión.

## 2. ¿Las pasivas están pensadas para el héroe del set?

- **3 y 4 piezas: sí, las 24.** Cada una engancha una pieza concreta del kit: Triple Golpe, Tajo, Trampa del Bosque, Paso Perfecto, Giro del Presagio, gancho, forma titánica, fusil, Pacto de almas…
- **2 piezas:** todas encajan con el rol, pero tres son genéricas o repetidas (**no se cambiaron**, es decisión de diseño):
  - *La Última Profecía* repite exactamente la de *Custodio* (+12% curación). Propuesta: +1 carga máxima de Presagio, o Presagio más rápido.
  - *La Manada* (+8% velocidad) y *Granadero* (+10% daño) no hablan del kit. Propuesta: Manada +15% duración de la Trampa; Granadero −10% tiempo de recarga del fusil.
- **Nombres que se cruzan:** la skin del Custodio se llama "Ángel **del Alba**" y existe el set universal "Profecía **del Alba**". Propuesta: en la tienda mostrar la skin como "Custodio · Ángel del Alba".

## 3. ¿Los usan todos los héroes? ¿La skin es solo del dueño?

Esto es lo que hace hoy el juego, verificado por la prueba:

- **Set de campeón:** lo equipa **solo su campeón** (`canEquipItem`). La skin aparece **solo** con el set **completo** puesto en su dueño: con 3 piezas no hay skin, hay aura parcial.
- **Set universal:** lo equipa **cualquier héroe**. **No tiene skin**, solo aura, que es parcial con 2-3 piezas y plena completo.

## 4. REGLAS DE SETS (propuesta para fijar)

1. **Dos familias.**
   - *Sets de campeón:* 12, uno por héroe, 4 piezas.
   - *Sets universales:* 11, 4 piezas; Lucifer tiene 6.
2. **Quién equipa qué.**
   - El set de campeón es **exclusivo de su dueño**.
   - El universal lo usa cualquiera.
   - *Por qué exclusivo:* sus bonus de 3 y 4 piezas son interacciones con el kit. En otro héroe serían piezas muertas, o habría que inventarles versiones genéricas que diluyen la identidad.
3. **Escalera de umbrales.**
   - **2 piezas:** estadística del rol del héroe.
   - **3 piezas:** interacción con UNA habilidad del kit.
   - **4 piezas:** cambia el loop del campeón.
   - Los sets **de campeón** son los **únicos** que pueden **modificar una habilidad** (pasivas que cambian habilidades, como quedamos). Siempre lo hacen desde el texto del umbral y con tope o enfriamiento.
   - Un universal nunca nombra una habilidad concreta.
4. **Skin = set de campeón completo, en su dueño, y solo si existe el arte.**
   - La skin es **cosmética**: cambia el cuerpo y el aspecto de las habilidades (`js/systems/skin-fx.js`), **nunca** números, áreas ni duraciones.
   - Si algo cambia mecánicamente, es por la pasiva del set, no por la skin.
5. **Una skin a la vez.** Con 6 ranuras solo entra un set completo de 4 piezas; los 2 espacios libres son para otras piezas o parciales.
6. **Mezclas permitidas:** 2+2+2 o 4+2. Cada bonus parcial alcanzado se aplica, sin topes especiales.
7. **Texto = código.** Todo umbral tiene su chequeo en `tools/items/t_sets.js`. Un set nuevo no entra sin su chequeo ("si el objeto dice que hace algo, tiene que hacerlo").
8. **Red.**
   - Las pasivas las calcula el anfitrión con el equipo real de cada jugador; eso ya existía con los loadouts.
   - La skin también la decide el anfitrión (`skinSet`).
9. **Bots:** mismas reglas; se ponen solo objetos de su campeón.
10. **Universales con skin:** por ahora no.
    - Serían 11 sets × 12 campeones = 132 hojas.
    - Se evalúa después de la alfa.
    - Mientras tanto, su "recompensa visual" es el aura.

> Si preferís la otra opción ("cualquier héroe equipa cualquier set, pero la skin y los bonus de 3-4 piezas solo valen en el dueño"), es un cambio chico en `canEquipItem` más una marca "(solo con X)" en el tooltip. Pero hay que decidir qué da el set en otro héroe: solo el bonus de 2 piezas.

## 5. Habilidades con skin: misma mecánica, otro aspecto

Con el set completo del dueño, cada lanzamiento hace dos cosas:

- Suma los **efectos pintados de su hoja**, recortados por `tools/art/skins_sets/fx.py` (87 cuadros). Aparecen donde corresponde:
  - frente al campeón (tajos);
  - sobre él (sellos, auras);
  - en el punto de impacto (zonas, trampas, cadenas, el anillo del Muro de Fuego);
  - como arte del proyectil (flechas de fuego, estrella arcana, orbe rosa, orbe glitch).
- **Tiñe** con el color de la skin lo que el kit ya dibujaba: partículas, proyectiles, ráfagas, ondas y el destello del lanzamiento. La sangre y el material de los enemigos no se tocan.

El Mago Ángel Arcano conserva los colores elementales, porque fuego, hielo y rayo son su lectura de juego; cambia el aspecto por la versión celestial de la hoja.

No cambia ningún número: la capa solo lee lo que el lanzamiento creó.
