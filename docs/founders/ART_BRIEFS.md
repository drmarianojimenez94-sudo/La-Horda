# Ascensión — encargos de arte (pendientes del Visual Gate)

**Estado:** ningún atlas de esta expansión fue producido. El pipeline del proyecto importa hojas
encargadas (`tools/expedition/build-art.py`: *"No drawing, recoloring or invented poses"*) y el Visual
Gate (`docs/ART_BIBLE.md` §8) exige revisión con reviewer y evidencia. Hasta entonces:

- Los seis STANDARD están en `releaseState: INTERNAL` (solo Test Lab).
- Nano GM y Facu GM están en `TESTING`: los usa su cuenta Fundadora y aparecen en la Tienda con su
  **sello** (no con un sprite sin aprobar).
- En partida se dibujan con el **sprite de respaldo** del rol base con paleta propia y sus VFX en capas
  separadas (alas, manto, enjambre, máscaras, etc.). Eso es provisorio y **no** cuenta como arte aprobado.

## Requisitos comunes (Art Bible §§2–7)

- Un atlas PNG por campeón, grilla `w×h` constante (referencia actual: 112×112, 4 columnas), 4 direcciones
  (abajo/costado/arriba; izquierda = espejo), filas: idle, walk(4), attack(4/dir), cast(4), ultimate(4),
  hit, death(4). Mismo formato que `js/champions/expedition/art.js`.
- Chibi (cabeza ~40–45%), ~66–70 unidades de alto, contorno de 1 px oscuro, 2–3 tonos por color,
  paleta de 4–6 colores + contorno, alfa 0/255, sin halos ni contaminación entre frames.
- VFX **fuera** del cuerpo: alas, agua, máscaras, enjambre y estructuras ya existen como capas de código
  (`js/champions/ascension/render.js`). El atlas solo dibuja el personaje.
- Cada skin: atlas completo + `preview.png` + thumbnail; cambia ropa/armadura/silueta secundaria (no recolor).
- Importar con el mismo importador, correr `python3 tools/art/scan_sprites.py --dir assets/sprites/champions/<id>`,
  `node tools/art/roster_visual_test.js` y completar `art.review` del manifiesto
  (`docs/production/ascension/<id>.json`). Recién entonces cambiar `releaseState` a `RELEASED`.

## Nano GM — El Regente del Umbral (FOUNDER)
- **Silueta:** joven atlético, estatura media, rulos oscuros, postura dominante. **Ambos brazos cubiertos
  de tatuajes negros** (rasgo principal de la silueta): en reposo, líneas negras sobre piel; en cast,
  grietas finas en el brazo activo (la grieta se dibuja en el atlas; el brillo lo pone el VFX).
- **Ropa:** sin guardapolvo, estetoscopio ni nada clínico. Chaleco/túnica corta oscura con detalles de
  oro contenido, pantalón oscuro, botas. Nada de mitad blanco/mitad negro.
- **Alas:** NO van en el atlas (capa de VFX asimétrica: pluma de luz / esquirla oscura).
- **Poses clave:** cast con un brazo alzado (alternar brazo izquierdo = Oscuridad, derecho = Luz en las
  direcciones de costado); ultimate: levitación con ambos brazos abiertos.
- **Skin "Regente del Eclipse Dorado":** hombreras con un aro de eclipse a la espalda, ribetes dorados en
  los tatuajes (dibujados), corona baja de oro mate. VFX ya implementado (perfil 1 de `ASC_SKIN_PROFILES`).

## Facu GM — El Soberano de las Mareas (FOUNDER)
- **Silueta:** joven musculoso, rulos oscuros, postura serena de quien lee el mar. Torso parcialmente
  cubierto por un manto corto; brazaletes de coral oscuro.
- **Arma:** **Quilla Ceremonial**: hoja larga hidrodinámica, inspiración muy sutil en una quilla/tabla, sin
  parecer tabla de surf.
- **Prohibido:** bermudas cómicas, camisa hawaiana, tridente genérico de Poseidón.
- **Manto de agua, corona de corrientes y leviatán:** capa de VFX (no en el atlas).
- **Skin "Soberano de la Fosa":** manto negro azulado con bioluminiscencia violeta (dibujada en puntos),
  corona de hueso de leviatán, quilla de obsidiana marina.

## Aurelia — La Arquitecta Solar (STANDARD, mago)
Túnica de arquitecta con hombreras angulares, compás gigante a la espalda, tres prismas (VFX) en órbita.
Skins: **Vitral del Mediodía** (paneles de vitral emplomado) y **Catedral Corrupta** (piedra ennegrecida
con grietas rojas). El Art Gate elige la mejor para el lanzamiento.

## Khepri — El Portador del Enjambre (STANDARD, asesino)
Armadura ceremonial de escarabajo, élitros abiertos, dos hoces curvas, tocado con disco solar opaco. El
enjambre es VFX (pool de 60 sprites). Skins: **Escarabajo de Lapislázuli**, **Plaga de Ceniza**.

## Velmira — La Reina de las Máscaras (STANDARD, soporte)
Vestido de telón con cuello alto, cetro de bambalinas. Cuatro máscaras flotantes (VFX: sonrisa,
grito, boca sellada, yelmo). **Prohibido:** hilos, destino, costuras o conexiones visuales similares.
Nombre nuevo para no pisar a la **Morwen** existente (Destiladora de Ecos), que se conserva intacta.
Skins: **Mascarada Veneciana**, **Reina del Réquiem Blanco**.

## Vhal — El Astrónomo Caído (STANDARD, mago)
Torso y brazos abiertos a un cielo estrellado (puntos dibujados; el titileo es VFX), túnica larga,
astrolabio roto. Skins: **Eclipse Anular**, **Nebulosa Carmesí**.

## Bront — La Fortaleza Viviente (STANDARD, tanque)
Armadura gigantesca vacía, cristal celeste en el pecho (en el atlas; el pulso es VFX), placas sueltas en los
hombros. Más grande que el Caballero dentro del rango tanque (§9 no aplica: es campeón). Skins:
**Bastión de Bronce Ritual**, **Coloso de Hielo Negro**.

## Oriel — La Portera de las Cicatrices (STANDARD, soporte)
Capa larga con capucha recortada, llave ceremonial más alta que ella; dos aros de fractura (VFX) a los
costados. Skins: **Llavera del Alba**, **Guardiana del Ojo Rojo**.
