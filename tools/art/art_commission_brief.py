# LA HORDA — genera docs/ART_COMMISSION_BRIEF.md (encargo de arte de personajes, T10).
# Los prompts se arman desde los datos de abajo para que TODOS repitan la ficha completa del personaje
# (autocontenidos: una imagen por prompt) y sigan el mismo formato. Uso:
#   python3 tools/art/art_commission_brief.py docs/ART_COMMISSION_BRIEF.md
import sys

OUT = sys.argv[1]

STYLE_ES = ("Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, "
            "paleta limitada, silueta fuerte y contorno oscuro de 1 píxel, luz desde arriba a la izquierda, "
            "vista cenital 3/4 (cámara desde arriba en diagonal, como un ARPG clásico).")
STYLE_EN = ("Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, "
            "strong silhouette with a 1-pixel dark outline, light from the top left, top-down 3/4 view (classic ARPG camera).")

DIRS = {
  "R":  ("mirando a la DERECHA, de perfil (el juego lo espeja para la izquierda)", "facing RIGHT, side view (the game mirrors it for the left)"),
  "D":  ("DE FRENTE, caminando hacia la cámara", "FACING THE CAMERA, walking toward the viewer"),
  "U":  ("DE ESPALDAS, alejándose de la cámara", "FROM BEHIND, walking away from the viewer"),
  "F":  ("de frente a la cámara, levemente girado a la derecha", "facing the camera, slightly turned to the right"),
}

def fmt_es(n, w, h, ch):
    return (f"Formato: UNA sola fila de {n} cuadros ({n} columnas × 1 fila), celdas iguales de {w}×{h} px separadas por 1 px. "
            f"Fondo transparente; si no se puede, un color plano magenta #FF00FF de borde a borde (sin degradé ni textura). "
            f"El personaje tiene el MISMO tamaño en todos los cuadros (≈{ch} px de alto) y apoya la base del cuerpo (pies, cola o panza) sobre la misma línea, "
            f"centrado en su celda. Sin texto, sin números, sin marcos, sin sombra en el piso, sin escenario ni efectos de fondo.")

def fmt_en(n, w, h, ch):
    return (f"Format: ONE single row of {n} frames ({n} columns × 1 row), equal {w}×{h} px cells with a 1 px gap. "
            f"Transparent background; if not possible, a flat magenta #FF00FF background edge to edge (no gradient, no texture). "
            f"The character is the SAME size in every frame (about {ch} px tall), the base of the body (feet, tail or belly) on the same baseline, centered in its cell. "
            f"No text, no numbers, no frames or borders, no ground shadow, no scenery, no background effects.")

REF_ES = "Usá la imagen anterior (adjuntala) como referencia EXACTA del personaje: mismo diseño, mismos colores, mismas proporciones y mismo tamaño en pantalla. Es el MISMO personaje en todos los cuadros."
REF_EN = "Use the previous image (attach it) as the EXACT character reference: same design, same colors, same proportions and same on-screen size. It is the SAME character in every frame."

def pal_str(pal):
    return ", ".join(f"{h} ({n})" for h, n in pal)

def prompt_blocks(c):
    out = []
    imgs = c["imgs"]
    N = len(imgs)
    w, h = c["cell"]; ch = c["ch"]
    for i, im in enumerate(imgs):
        n = sum(p[1] for p in im["parts"])
        dir_es, dir_en = DIRS[im.get("dir", "R")]
        parts_es = "; ".join(f"cuadros {a}–{a+k-1}: {t}" if k > 1 else f"cuadro {a}: {t}" for (t, k, _), a in _starts(im["parts"]))
        parts_en = "; ".join(f"frames {a}–{a+k-1}: {t}" if k > 1 else f"frame {a}: {t}" for (_, k, t), a in _starts(im["parts"]))
        es = (f"PROMPT {i+1}/{N} — {c['name']}: {im['t_es']}\n"
              + (REF_ES + "\n" if i > 0 else "")
              + f"Hoja de sprites para un videojuego. PERSONAJE: {c['desc_es']}\n"
              f"PALETA: {pal_str(c['pal'])}.\n"
              f"ESTA IMAGEN: {im['t_es']}, {n} cuadros, {dir_es}. {parts_es}. {im.get('m_es', '')}\n"
              f"{fmt_es(n, w, h, ch)}\n{STYLE_ES}")
        en = (f"PROMPT {i+1}/{N} — {c['name_en']}: {im['t_en']}\n"
              + (REF_EN + "\n" if i > 0 else "")
              + f"Sprite sheet for a video game. CHARACTER: {c['desc_en']}\n"
              f"PALETTE: {pal_str(c['pal'])}.\n"
              f"THIS IMAGE: {im['t_en']}, {n} frames, {dir_en}. {parts_en}. {im.get('m_en', '')}\n"
              f"{fmt_en(n, w, h, ch)}\n{STYLE_EN}")
        out.append((es.replace(" \n", "\n").replace(". .", "."), en.replace(" \n", "\n").replace(". .", ".")))
    return out

def _starts(parts):
    a = 1
    for p in parts:
        yield p, a
        a += p[1]

def planilla(c):
    rows = ["| Imagen | Estado | Dirección | Cuadros | Bucle |", "|---|---|---|---|---|"]
    dname = {"R": "perfil derecha (se espeja)", "D": "frente", "U": "espalda", "F": "frente"}
    for i, im in enumerate(c["imgs"]):
        for (t, k, _) in im["parts"]:
            rows.append(f"| {i+1} | {t} | {dname[im.get('dir','R')]} | {k} | {'sí' if im.get('loop') else 'no'} |")
    return "\n".join(rows)

# ---------------------------------------------------------------- personajes
W = lambda es, k, en: (es, k, en)
C = []

C.append(dict(id="P0-01", key="golem_cuerpos", name="Golem de Cuerpos", name_en="Golem of Corpses",
  arena="10 · Arena Infernal", rank="Jefe (2ª de las 3 formas del jefe final)",
  role="Cuerpo a cuerpo lento y enorme (radio 78, velocidad 38): golpetazo en área, Manos de los Caídos, Nova Profana.",
  hoy="Hoja de 1 cuadro por estado (quieto = caminar = golpe); el ataque es otra pose fija. Se veía como una estatua deslizándose.",
  temp="Cuerpo del Gólem de Cristal (hoja completa de la Arena Gélida) recoloreado a carne y sangre. Nombre sin cambios.",
  desc_es="el GOLEM DE CUERPOS, segunda forma del Hechicero Supremo en la pelea final. Una mole encorvada de tres veces el alto de un héroe, cosida con los cuerpos de todos los que cayeron en el camino: brazos, torsos y cráneos fundidos en una masa de carne oscura, atada con tendones rojos que brillan y cadenas rotas. Detrás de la cabeza lleva un halo de huesos en punta, como una corona de costillas, con el sigilo dorado del Hechicero en el pecho. Brazos enormes que casi tocan el piso, se mueve pesado.",
  desc_en="the GOLEM OF CORPSES, second form of the Supreme Sorcerer in the final fight. A hunched colossus three times a hero's height, stitched together from the bodies of everyone who fell along the way: arms, torsos and skulls fused into a mass of dark flesh, bound with glowing red sinews and broken chains. Behind its head a halo of pointed bones like a crown of ribs, the Sorcerer's golden sigil set in its chest. Huge arms that almost drag on the floor, heavy movement.",
  pal=[("#1a0808","negro sangre"),("#4a1216","carne oscura"),("#8a2a2a","carne"),("#c0503a","herida viva"),("#d8c8a8","hueso"),("#e8c27a","oro del sigilo")],
  cell=(320,272), ch=250,
  imgs=[dict(t_es="quieto (respira)", t_en="idle (breathing)", loop=True, parts=[W("quieto, el pecho late y el halo vibra", 4, "idle, the chest pulses and the halo trembles")]),
        dict(t_es="caminar", t_en="walk cycle", loop=True, parts=[W("caminar pesado, brazos balanceándose", 6, "heavy walk, arms swinging")], m_es="Ciclo que se repite sin saltos.", m_en="Seamless looping cycle."),
        dict(t_es="golpetazo con los dos brazos", t_en="two-arm ground slam", parts=[W("levanta los brazos", 2, "raises both arms"), W("golpea el piso y queda agachado", 2, "slams the ground and stays crouched")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido, se echa atrás", 2, "hurt, recoils backwards"), W("muerte: se desarma en cuerpos que caen y quedan en un montón", 6, "death: it falls apart into bodies that collapse into a pile")]),
        dict(t_es="se forma de los restos (entrada en escena)", t_en="rises from the remains (entrance)", parts=[W("un montón de cuerpos se levanta y toma forma", 4, "a pile of bodies rises and takes shape")])]))

C.append(dict(id="P0-02", key="cm_presentador", name="El Presentador", name_en="The Presenter",
  arena="01 · Ciudad Maldita", rank="Jefe final de la arena (3 actos)",
  role="A distancia (radio 40, velocidad 58): abanicos de proyectiles, reflectores que marcan, telones de fuego; se transforma dos veces.",
  hoy="Arte de 32 px de alto dibujado a 4–5 veces: en pantalla se ve en bloques. Caminata de 2 cuadros.",
  temp="Cuerpo del Mago de Hielo y Cristal (hoja completa) en carmesí y oro (acto I), violeta oscuro (acto II) y rojo fuego (acto III). Nombre sin cambios.",
  desc_es="EL PRESENTADOR, el dueño del espectáculo de la Ciudad Maldita. Un maestro de ceremonias demoníaco, alto y flaco, con cara de calavera sonriente y ojos rojos, galera negra con cinta roja, levita carmesí larga con solapas doradas y chaleco negro, guantes blancos gastados y un bastón negro con un orbe rojo que brilla en la punta. Pose teatral, como si presentara un número.",
  desc_en="THE PRESENTER, owner of the show of the Cursed City. A tall, thin demonic ringmaster with a grinning skull face and red eyes, a black top hat with a red band, a long crimson tailcoat with golden lapels and a black vest, worn white gloves and a black cane topped with a glowing red orb. Theatrical pose, as if introducing an act.",
  pal=[("#120a0e","negro"),("#3a1420","vino oscuro"),("#8a1a2a","carmesí"),("#c02030","rojo"),("#e8c27a","oro"),("#efe6d6","hueso/guantes")],
  cell=(96,128), ch=110,
  imgs=[dict(t_es="acto I: quieto", t_en="act I: idle", loop=True, parts=[W("quieto, gira el bastón", 4, "idle, twirls the cane")]),
        dict(t_es="acto I: caminar", t_en="act I: walk", loop=True, parts=[W("caminar elegante", 6, "elegant walk")]),
        dict(t_es="acto I: lanzar abanico de proyectiles", t_en="act I: cast a fan of projectiles", parts=[W("levanta el bastón", 2, "raises the cane"), W("abre los brazos y el orbe destella", 2, "opens his arms, the orb flashes"), W("vuelve a la pose", 2, "returns to pose")]),
        dict(t_es="golpe recibido (acto I)", t_en="hurt (act I)", parts=[W("golpe recibido, se le ladea la galera", 2, "hurt, his top hat tilts")]),
        dict(t_es="transformación, primera mitad", t_en="transformation, first half", parts=[W("se encorva, la levita se rasga y le crecen garras", 6, "hunches over, the tailcoat tears and claws grow")]),
        dict(t_es="acto II (transformado): caminar", t_en="act II (transformed): walk", loop=True, parts=[W("caminar encorvado, con garras, la galera rota", 6, "hunched walk with claws, broken top hat")], m_es="Mismo personaje, ahora más bestial: espalda encorvada, levita hecha jirones, garras largas.", m_en="Same character, now more bestial: hunched back, tattered tailcoat, long claws."),
        dict(t_es="acto II: zarpazo/lanzamiento", t_en="act II: claw / cast", parts=[W("zarpazo con las dos garras", 6, "two-claw swipe")]),
        dict(t_es="acto III (verdadera forma): flotar", t_en="act III (true form): float", loop=True, parts=[W("espectro carmesí y violeta que flota, telas que ondulan, calavera con galera", 6, "a floating crimson-violet wraith, rippling cloth, skull with top hat")]),
        dict(t_es="acto III: ataque (ovación)", t_en="act III: attack (ovation)", parts=[W("abre los brazos y lanza energía roja", 6, "opens its arms and releases red energy")]),
        dict(t_es="acto III: muerte", t_en="act III: death", parts=[W("se deshace en telas y humo rojo hasta desaparecer", 8, "unravels into cloth and red smoke until it vanishes")])]))

C.append(dict(id="P0-03", key="cm_dama", name="La Dama del Telón", name_en="The Lady of the Curtain",
  arena="01 · Ciudad Maldita", rank="Subjefe (nivel 9) + sus Espejismos (copias traslúcidas)",
  role="A distancia e invocación (radio 36, velocidad 62): telones en línea, zonas oscuras, espejismos y ecos; estalla al 30%.",
  hoy="Arte de 27 px de ancho dibujado a ~5 veces: se ve en bloques. Caminata de 2 cuadros.",
  temp="Cuerpo de la Dama del Bosque (hoja completa) con los rojos llevados al carmesí del teatro. Nombre sin cambios.",
  desc_es="LA DAMA DEL TELÓN, subjefe de la Ciudad Maldita. Una mujer altísima y demacrada, piel gris pálida, corona de espinas doradas, un vestido que es un telón de teatro rojo y pesado que se arrastra y se abre en jirones, manos largas con uñas negras. Se mueve flotando, solemne, como bajando el telón sobre la ciudad.",
  desc_en="THE LADY OF THE CURTAIN, sub-boss of the Cursed City. A very tall, gaunt woman with pale grey skin, a crown of golden thorns, a dress that is a heavy red theater curtain dragging and tearing into strips, long hands with black nails. She glides solemnly, as if lowering the curtain on the city.",
  pal=[("#140a10","negro"),("#4a1020","vino"),("#9a1a2c","telón rojo"),("#d0303a","rojo vivo"),("#c8b8b0","piel gris"),("#e0b050","oro")],
  cell=(96,128), ch=110,
  imgs=[dict(t_es="quieto", t_en="idle", loop=True, parts=[W("quieto, el telón ondula", 4, "idle, the curtain ripples")]),
        dict(t_es="caminar (flotando)", t_en="walk (gliding)", loop=True, parts=[W("avanza flotando, el vestido se arrastra", 6, "glides forward, the dress drags")]),
        dict(t_es="conjuro: bajar el telón", t_en="cast: drop the curtain", parts=[W("levanta un brazo", 2, "raises one arm"), W("baja el brazo con fuerza, el vestido se abre", 2, "brings the arm down hard, the dress flares"), W("vuelve a la pose", 2, "returns to pose")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: el telón la envuelve y cae vacío al piso", 6, "death: the curtain wraps around her and falls empty to the floor")])]))

C.append(dict(id="P0-04", key="cm_maestro", name="Maestro de Ceremonias", name_en="Master of Ceremonies",
  arena="01 · Ciudad Maldita", rank="Subjefe (nivel 9, pelea junto al Tramoyista)",
  role="A distancia y control (radio 32, velocidad 70): marca que estalla, zonas rojas, teletransporte.",
  hoy="Arte de 22×70 px con el personaje de 24 px dibujado a 5 veces: bloques. Caminata de 2 cuadros.",
  temp="Cuerpo de la Druida de Arena (tira completa del Laberinto) en carmesí oscuro. Nombre sin cambios.",
  desc_es="el MAESTRO DE CEREMONIAS, ayudante del Presentador. Un hombre esquelético de sonrisa enorme y ojos rojos, galera alta con cinta roja, frac rojo oscuro con faldones largos y botones de hueso, pantalón a rayas negro y vino, y un bastón largo coronado por un ojo rojo brillante. Postura encorvada y teatral.",
  desc_en="the MASTER OF CEREMONIES, the Presenter's assistant. A skeletal man with a huge grin and red eyes, a tall top hat with a red band, a dark red tailcoat with long tails and bone buttons, black-and-wine striped trousers, and a long cane topped with a glowing red eye. Hunched, theatrical posture.",
  pal=[("#120a0e","negro"),("#3a1420","vino oscuro"),("#7a1624","frac"),("#d02838","ojo rojo"),("#d8c8b0","hueso"),("#c8a060","oro viejo")],
  cell=(96,128), ch=104,
  imgs=[dict(t_es="quieto", t_en="idle", loop=True, parts=[W("quieto, apoya el bastón", 4, "idle, leaning on the cane")]),
        dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar teatral, bastón adelante", 6, "theatrical walk, cane forward")]),
        dict(t_es="conjuro: marca", t_en="cast: mark", parts=[W("apunta con el bastón y el ojo se enciende", 6, "points the cane and the eye lights up")]),
        dict(t_es="teletransporte", t_en="teleport", parts=[W("se hunde en humo rojo", 3, "sinks into red smoke"), W("reaparece del humo", 3, "reappears from the smoke")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido, se le cae la galera", 2, "hurt, his hat falls"), W("muerte: se desploma y queda el bastón", 6, "death: collapses, only the cane remains")])]))

C.append(dict(id="P0-05", key="cm_tramoyista", name="El Tramoyista", name_en="The Stagehand",
  arena="01 · Ciudad Maldita", rank="Subjefe (nivel 9, pelea junto al Maestro)",
  role="Cuerpo a cuerpo pesado (radio 48, velocidad 52): golpe en cono, deja caer decorado, arma barricadas.",
  hoy="Arte de 32×46 px dibujado a ~5 veces: bloques. Caminata de 2 cuadros.",
  temp="Cuerpo del Autómata de Hierro (hoja completa de la Fábrica) en vino y hierro viejo. Nombre sin cambios.",
  desc_es="EL TRAMOYISTA, el que mueve el escenario del Presentador. Un bruto jorobado enorme, piel gris violácea llena de cicatrices, cara deforme con colmillos, que carga a la espalda un armazón de madera y hierro con poleas y sogas (la tramoya del teatro), delantal de cuero, brazos gigantes con vendas y un martillo de utilería. Camina pesado, arrastrando los nudillos.",
  desc_en="THE STAGEHAND, the one who moves the Presenter's stage. A huge hunchbacked brute with scarred violet-grey skin, a deformed tusked face, carrying on his back a wood-and-iron rig with pulleys and ropes (the theater's fly system), a leather apron, gigantic bandaged arms and a prop hammer. Heavy walk, knuckles dragging.",
  pal=[("#141012","negro"),("#4a3a3a","hierro viejo"),("#6a2a2a","cuero vino"),("#8a7a8a","piel gris violácea"),("#a07040","madera"),("#c02a30","rojo")],
  cell=(128,128), ch=112,
  imgs=[dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar pesado, la tramoya se balancea", 6, "heavy walk, the rig sways")]),
        dict(t_es="golpe pesado", t_en="heavy strike", parts=[W("levanta el martillo", 2, "raises the hammer"), W("golpe en arco hacia adelante", 2, "forward arcing strike"), W("recupera", 2, "recovers")]),
        dict(t_es="arrastrar decorado", t_en="drag scenery", parts=[W("tira de una soga con las dos manos", 6, "pulls a rope with both hands")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: cae de rodillas y la tramoya se le derrumba encima", 6, "death: falls to his knees and the rig collapses on him")])]))

def sea(key, idd, name, name_en, rank, role, hoy, temp, desc_es, desc_en, pal, cell, ch, imgs):
    C.append(dict(id=idd, key=key, name=name, name_en=name_en, arena="06 · Arena Acuática", rank=rank, role=role, hoy=hoy, temp=temp,
                  desc_es=desc_es, desc_en=desc_en, pal=pal, cell=cell, ch=ch, imgs=imgs))

SWIM4 = lambda es, en: [dict(t_es="nadar", t_en="swim", loop=True, parts=[W(es, 6, en)]),
                        dict(t_es="ataque", t_en="attack", parts=[W("prepara", 1, "wind-up"), W("muerde / golpea hacia adelante", 2, "bites / strikes forward"), W("recupera", 1, "recovers")]),
                        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se da vuelta y se hunde", 4, "death: turns belly-up and sinks")]),
                        dict(t_es="nadar de frente y de espaldas", t_en="swim toward and away from camera", dir="D", loop=True, parts=[W("de frente", 4, "toward the camera"), W("de espaldas", 4, "away from the camera")])]

sea("tiburon_joven", "P0-06", "Tiburón Joven", "Young Shark", "Común (nivel 1+)", "Cuerpo a cuerpo rápido (radio 22, velocidad 132), en manada.",
    "2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso.", "Cuerpo del Esqueleto Cornudo en verde agua y hueso: pasa a llamarse «Ahogado de las Ruinas». Al volver el arte, se borra la entrada y recupera su nombre.",
    "un TIBURÓN JOVEN de las ruinas hundidas: tiburón azul acero de lomo oscuro y panza blanca, cicatrices en el hocico, aletas con bordes rasgados, ojos vacíos, nada en círculos. Tamaño de un héroe acostado.",
    "a YOUNG SHARK from the sunken ruins: steel-blue shark with a dark back and white belly, scars on the snout, ragged fin edges, empty eyes, swimming in circles. About the length of a hero lying down.",
    [("#0e1a24","azul noche"),("#24486a","lomo"),("#4a78a8","azul acero"),("#dfe6ec","panza"),("#b04040","encías")], (64,64), 40,
    SWIM4("nado de perfil, cola que empuja", "side swim, tail pushing"))
sea("tiburon_blanco", "P0-07", "Tiburón Blanco", "Great White Shark", "Élite (niveles altos)", "Cuerpo a cuerpo rápido y pesado (radio 34, velocidad 112): embestida y mordida.",
    "1 cuadro quieto + 1 de ataque, sin golpe ni muerte.", "Cuerpo del Demonio de Hielo en verde abisal: pasa a llamarse «Tritón de las Fosas».",
    "el TIBURÓN BLANCO, el cazador favorito del Leviatán: un tiburón enorme gris pálido casi blanco, lomo marcado de cicatrices y arpones rotos clavados, mandíbula con varias filas de dientes, ojos negros.",
    "the GREAT WHITE SHARK, the Leviathan's favorite hunter: a huge pale grey, almost white shark, back covered in scars with broken harpoons stuck in it, jaws with several rows of teeth, black eyes.",
    [("#1a2228","gris oscuro"),("#6a7a86","gris lomo"),("#c8d2da","blanco sucio"),("#f0f4f6","panza"),("#a03030","encías")], (96,64), 44,
    [dict(t_es="nadar", t_en="swim", loop=True, parts=[W("nado de perfil, poderoso", 6, "powerful side swim")]),
     dict(t_es="embestida y mordida", t_en="charge and bite", parts=[W("se echa atrás", 1, "pulls back"), W("embiste con la boca abierta", 2, "charges with open jaws"), W("cierra la mordida", 1, "snaps the jaws shut")]),
     dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se da vuelta y se hunde", 4, "death: turns belly-up and sinks")]),
     dict(t_es="nadar de frente y de espaldas", t_en="swim toward and away from camera", dir="D", loop=True, parts=[W("de frente", 4, "toward the camera"), W("de espaldas", 4, "away from the camera")])])
sea("cangrejo_acorazado", "P0-08", "Cangrejo Acorazado", "Armored Crab", "Común (niveles medios)", "Cuerpo a cuerpo lento y duro (radio 26, velocidad 42).",
    "2 cuadros quietos + 1 de ataque, sin golpe ni muerte; píxel grueso.", "Cuerpo de la Araña Mecánica en rojo coral: pasa a llamarse «Cangrejo Araña».",
    "un CANGREJO ACORAZADO que creció dentro de la armadura de un soldado ahogado: caparazón rojo con placas de hierro oxidado y un casco hundido encajado encima, tenazas enormes, percebes y algas.",
    "an ARMORED CRAB that grew inside the armor of a drowned soldier: red shell with rusted iron plates and a dented helmet wedged on top, huge pincers, barnacles and seaweed.",
    [("#1a0c0a","negro"),("#6a1e18","rojo oscuro"),("#b0402c","rojo cangrejo"),("#e08a5a","coral"),("#6a6a62","hierro"),("#5a8a5a","alga")], (64,64), 38,
    [dict(t_es="caminar de costado", t_en="sideways walk", loop=True, parts=[W("camina de costado, patas alternadas", 6, "walks sideways, alternating legs")]),
     dict(t_es="tenazazo", t_en="pincer strike", parts=[W("abre las tenazas", 1, "opens the pincers"), W("cierra con fuerza hacia adelante", 2, "snaps forward hard"), W("recupera", 1, "recovers")]),
     dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido, se encoge", 1, "hurt, retracts"), W("muerte: se da vuelta panza arriba, patas que se cierran", 4, "death: flips belly-up, legs curling in")]),
     dict(t_es="caminar de frente y de espaldas", t_en="walk toward and away from camera", dir="D", loop=True, parts=[W("de frente", 4, "toward the camera"), W("de espaldas", 4, "away from the camera")])])
sea("medusa_electrica", "P0-09", "Medusa Eléctrica", "Electric Jellyfish", "Común", "Cuerpo a cuerpo lento (radio 22, velocidad 50): descarga al contacto.",
    "2 cuadros quietos + 1 de ataque, sin golpe ni muerte.", "Cuerpo del Acechador de Esporas (Reino Fúngico) en azul eléctrico. Nombre sin cambios.",
    "una MEDUSA ELÉCTRICA cargada con la energía de los cristales perdidos: campana translúcida violeta y azul con venas de luz, tentáculos largos que chisporrotean con rayos amarillos, flota a media altura.",
    "an ELECTRIC JELLYFISH charged with the energy of lost crystals: a translucent violet-blue bell with glowing veins, long tentacles crackling with yellow lightning, floating at mid height.",
    [("#140a2a","violeta noche"),("#4a3a9a","violeta"),("#8a6fd8","lavanda"),("#bfe0ff","luz"),("#ffe86a","rayo")], (64,80), 52,
    [dict(t_es="flotar (pulso)", t_en="float (pulse)", loop=True, parts=[W("la campana se contrae y se abre", 6, "the bell contracts and expands")]),
     dict(t_es="descarga", t_en="discharge", parts=[W("se ilumina", 1, "lights up"), W("descarga, rayos en los tentáculos", 2, "discharges, lightning on the tentacles"), W("se apaga", 1, "dims")]),
     dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se apaga, se desinfla y cae", 4, "death: goes dark, deflates and sinks")])])
sea("sirena_abisal", "P0-10", "Sirena Abisal", "Abyssal Siren", "Común (nivel 4+)", "A distancia (radio 22, velocidad 70, alcance 280): canto / proyectil de agua.",
    "1 cuadro quieto + 1 de ataque, sin golpe ni muerte.", "Cuerpo de la Medusa del Laberinto (mujer con cola de serpiente) en azul abisal. Nombre sin cambios.",
    "una SIRENA ABISAL de las fosas: mujer de piel azul pálida con cola de pez larga y oscura, pelo negro que flota como algas, ojos blancos que brillan, aletas en los brazos, collar de perlas negras. Canta con la boca abierta.",
    "an ABYSSAL SIREN from the trenches: a pale blue-skinned woman with a long dark fish tail, black hair floating like seaweed, glowing white eyes, fins on her arms, a black pearl necklace. She sings with her mouth open.",
    [("#0a1420","azul noche"),("#1e3a5a","cola"),("#3a5a8a","azul"),("#8ab8d8","piel"),("#7fd0e0","brillo"),("#1a1418","pelo")], (64,80), 56,
    [dict(t_es="deslizarse", t_en="glide", loop=True, parts=[W("avanza ondulando la cola", 6, "moves forward undulating the tail")]),
     dict(t_es="canto / lanzar proyectil de agua", t_en="song / cast a water projectile", parts=[W("toma aire", 1, "breathes in"), W("canta y lanza una esfera de agua", 2, "sings and throws a water orb"), W("recupera", 1, "recovers")]),
     dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se desploma y se disuelve en espuma", 4, "death: collapses and dissolves into foam")])])

C.append(dict(id="P0-11", key="ab_jinete", name="Jinete Sin Cabeza (Abismo)", name_en="Headless Rider (Abyss)",
  arena="08 · Abismo", rank="Élite (nivel 6+)",
  role="Carga en línea (radio 34, velocidad 92): marca la trayectoria y embiste empujando a todo lo que toca.",
  hoy="Caminar de 1 cuadro; el ataque es el mismo quieto. Arte a ~4 veces: bloques.",
  temp="Cuerpo del Jinete Sin Cabeza de la Arena Divina (hoja completa) llevado al violeta del Abismo. Mismo personaje de leyenda: nombre sin cambios.",
  desc_es="el JINETE SIN CABEZA del Abismo: un caballero antiguo con armadura negra y púrpura, sin cabeza (del cuello sale una llama violeta), capa hecha jirones, una lanza larga con punta violeta brillante, montado en un caballo demoníaco negro de crines y cascos de fuego violeta, ojos rojos.",
  desc_en="the HEADLESS RIDER of the Abyss: an ancient knight in black and purple armor, headless (a violet flame rises from the neck), tattered cape, a long lance with a glowing violet tip, riding a black demonic horse with violet fire mane and hooves, red eyes.",
  pal=[("#0e0a14","negro"),("#2a1a3a","púrpura oscuro"),("#6040a0","violeta"),("#b070ff","fuego violeta"),("#8a8a9a","acero"),("#c02030","ojos")],
  cell=(112,96), ch=84,
  imgs=[dict(t_es="galope", t_en="gallop", loop=True, parts=[W("galope de perfil", 6, "side gallop")]),
        dict(t_es="preparar la carga", t_en="charge wind-up", parts=[W("el caballo se para en dos patas y el jinete apunta la lanza", 4, "the horse rears up and the rider levels the lance")]),
        dict(t_es="carga e impacto", t_en="charge and impact", parts=[W("carga a toda velocidad, lanza al frente", 4, "full-speed charge, lance forward"), W("impacto y frenada", 2, "impact and skid")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: el caballo cae y jinete y montura se deshacen en fuego violeta", 5, "death: the horse falls and rider and mount dissolve into violet fire")])]))

C.append(dict(id="P0-12", key="ab_carcelero", name="El Carcelero del Vacío", name_en="The Void Jailer",
  arena="08 · Abismo", rank="Subjefe (nivel 9)",
  role="Cuerpo a cuerpo gigante (radio 62, velocidad 48): golpe de cadena en línea, barrido, pisotón, gancho que arrastra.",
  hoy="Caminar de 1 cuadro de perfil; arte de 37 px de alto dibujado a ~5,6 veces: bloques.",
  temp="Cuerpo del Carcelero Deforme (hoja completa de la Fábrica) agrandado y en violeta del vacío. Nombre sin cambios.",
  desc_es="EL CARCELERO DEL VACÍO, un gigante encadenado que mantiene unidas las ruinas del Abismo: cuerpo enorme de piel gris morada, yelmo de hierro con forma de jaula y una ranura que brilla violeta, grilletes en muñecas y cuello de los que cuelgan cadenas gruesas, taparrabos rojo oscuro, cadenas enrolladas en los brazos que usa como látigo.",
  desc_en="THE VOID JAILER, a chained giant who holds the ruins of the Abyss together: huge body with purple-grey skin, a cage-shaped iron helm with a glowing violet slit, shackles on wrists and neck with thick chains hanging from them, a dark red loincloth, chains wrapped around the arms that he uses as whips.",
  pal=[("#0e0a12","negro"),("#3a2a3a","hierro"),("#6a5a6a","piel gris morada"),("#7a2a4a","rojo oscuro"),("#b070ff","brillo violeta"),("#9a9aa6","cadena")],
  cell=(128,128), ch=118,
  imgs=[dict(t_es="quieto", t_en="idle", loop=True, parts=[W("quieto, las cadenas cuelgan y se mecen", 4, "idle, chains hang and sway")]),
        dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar pesado arrastrando cadenas", 6, "heavy walk dragging chains")]),
        dict(t_es="golpe de cadena", t_en="chain lash", parts=[W("echa la cadena atrás", 2, "swings the chain back"), W("la lanza hacia adelante en línea", 2, "whips it forward in a line"), W("recoge", 2, "pulls it back")]),
        dict(t_es="pisotón", t_en="stomp", parts=[W("levanta el pie", 2, "lifts a foot"), W("pisa y el piso se agrieta", 2, "stomps, the floor cracks"), W("recupera", 2, "recovers")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: cae de rodillas y las cadenas se rompen", 6, "death: falls to his knees and the chains snap")])]))

C.append(dict(id="P1-01", key="esfinge", name="Esfinge", name_en="Sphinx",
  arena="07 · Laberinto", rank="Élite (niveles altos)",
  role="Élite pesado (radio 34, velocidad 92, a distancia 300): zarpazo, embestida y proyectil.",
  hoy="Sin ninguna vista de ataque ni de golpe, y sin muerte en su diseño (la última hoja trajo otra esfinge).",
  temp="Cuerpo del Cù-Sìth (hoja completa de las Ruinas) en oro y arena. Nombre sin cambios.",
  desc_es="la ESFINGE del Laberinto: cuerpo de león de piedra arenisca dorada, alas plegadas de plumas color arena, cabeza de mujer encapuchada con un velo de lino y ojos que brillan ámbar, joyas de oro viejo en el cuello y las patas. Solemne y pesada.",
  desc_en="the SPHINX of the Labyrinth: a golden sandstone lion body, folded sand-colored feathered wings, the head of a hooded woman with a linen veil and glowing amber eyes, old gold jewelry on the neck and paws. Solemn and heavy.",
  pal=[("#1e140a","sombra"),("#6a4a22","arena oscura"),("#b3923f","arenisca"),("#e0c070","oro"),("#f0e0b0","lino"),("#ffb040","ojos ámbar")],
  cell=(96,80), ch=64,
  imgs=[dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar felino de perfil", 6, "feline side walk")]),
        dict(t_es="zarpazo", t_en="claw swipe", parts=[W("se alza", 1, "rears"), W("zarpazo hacia adelante", 2, "forward claw swipe"), W("recupera", 1, "recovers")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se echa y se deshace en arena", 4, "death: lies down and crumbles into sand")])]))

# orden del playtest = orden de campaña: Ciudad (01), Acuática (06), Abismo (08), Infernal (10); P1 al final
_g = [c for c in C if c["key"] == "golem_cuerpos"][0]
C.remove(_g); C.insert([i for i, c in enumerate(C) if c["key"] == "ab_carcelero"][0] + 1, _g)
_n = 0
for c in C:
    if c["id"].startswith("P0"):
        _n += 1; c["id"] = "P0-%02d" % _n
# ---------------------------------------------------------------- faltantes que se mantienen
K = []
def keep(**kw): K.append(kw)
HD = lambda: dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: cae y se desvanece", 5, "death: falls and fades")])

keep(id="F-01", key="mn_cerbero", name="Cerbero, Guardián del Umbral", name_en="Cerberus, Warden of the Threshold", arena="09 · Minas Profundas", rank="Jefe",
  role="Jefe con 3 actos y cadenas atadas a la puerta (radio 58).", why="Se MANTIENE: tiene todas sus animaciones (caminar 8, lanzallamas 10, mordida 10, muerte 16) y sus mecánicas dependen del cuerpo (cadenas, tres cabezas). Solo es arte de baja resolución (≈54×67) escalado 5 veces.",
  desc_es="CERBERO, el perro de tres cabezas que custodia la puerta al Infierno, parcialmente muerto: cabeza izquierda de bestia con cicatrices y hueso expuesto, cabeza central de fuego con la mandíbula fundida, cabeza derecha de sombra con ojos de humo; cuerpo musculoso negro y rojo con costillas a la vista, cadenas de hierro rotas en el cuello.",
  desc_en="CERBERUS, the three-headed hound guarding the gate to Hell, partly dead: left head a scarred beast with exposed bone, center head of fire with a molten jaw, right head of shadow with smoke eyes; a muscular black and red body with visible ribs, broken iron chains on the neck.",
  pal=[("#0e0806","negro"),("#3a1410","carne quemada"),("#8a2a1a","rojo"),("#ff7a2a","fuego"),("#d8c8a8","hueso"),("#5a5a62","cadena")], cell=(192,192), ch=150,
  imgs=[dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar de perfil, las tres cabezas se mueven distinto", 8, "side walk, the three heads move independently")]),
        dict(t_es="lanzallamas", t_en="flamethrower", parts=[W("la cabeza central se echa atrás y escupe fuego en cono", 8, "the center head rears back and breathes a cone of fire")]),
        dict(t_es="mordida triple", t_en="triple bite", parts=[W("las tres cabezas muerden una tras otra", 8, "the three heads bite one after another")]),
        dict(t_es="pisotón y aullido", t_en="stomp and howl", parts=[W("pisotón con las patas delanteras", 4, "front-paw stomp"), W("aullido con las tres cabezas al cielo", 4, "howl with all three heads raised")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: cae de costado y el fuego se apaga", 6, "death: falls on its side and the fire goes out")])])
keep(id="F-02", key="angel_corrompido", name="Ángel Corrompido", name_en="Corrupted Angel", arena="10 · Arena Infernal", rank="Jefe (1ª forma del jefe final)",
  role="A distancia con los poderes de los Cuatro (radio 46).", why="Se MANTIENE: tiene animación completa (el cuerpo del Hechicero recoloreado, con alas y cristales que dibuja el código). No está tieso; le falta identidad propia.",
  desc_es="el ÁNGEL CORROMPIDO, primera forma del Hechicero Supremo: un hechicero alto de túnica blanca manchada de carmesí, alas rotas de plumas rojas y negras, un halo dorado agrietado, cuatro cristales que orbitan (verde, celeste, ámbar y oro blanco), cara serena y cruel.",
  desc_en="the CORRUPTED ANGEL, first form of the Supreme Sorcerer: a tall sorcerer in a white robe stained crimson, torn wings of red and black feathers, a cracked golden halo, four orbiting crystals (green, pale blue, amber and white gold), a serene, cruel face.",
  pal=[("#1a0a0e","negro"),("#8a1a2a","carmesí"),("#efe6d6","túnica"),("#e8c27a","halo"),("#8ee07a","cristal verde"),("#bfe8ff","cristal celeste")], cell=(128,128), ch=112,
  imgs=[dict(t_es="quieto y caminar", t_en="idle and walk", loop=True, parts=[W("quieto flotando", 4, "floating idle"), W("avanzar flotando", 4, "gliding forward")]),
        dict(t_es="conjuro", t_en="cast", parts=[W("levanta las manos y los cristales giran rápido", 8, "raises both hands and the crystals spin fast")]),
        dict(t_es="ataque", t_en="attack", parts=[W("golpe de ala hacia adelante", 4, "forward wing strike")]),
        dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: las alas se deshacen en plumas", 6, "death: the wings burst into feathers")])])
keep(id="F-03", key="demonio_mayor", name="Rey de la Horda (Demonio Mayor)", name_en="King of the Horde (Greater Demon)", arena="10 · Arena Infernal", rank="Jefe (forma final)",
  role="Forma final (radio 70).", why="Se MANTIENE: camina y ataca con arte real en 4 direcciones. Le faltan golpe y muerte propios (clona el caminar).",
  desc_es="el REY DE LA HORDA: demonio gigante de piel roja oscura, cuernos de carnero enormes, armadura de hierro negro con púas, un hacha doble de hueso, cola larga, ojos amarillos.",
  desc_en="the KING OF THE HORDE: a giant dark-red demon with huge ram horns, spiked black iron armor, a double-bladed bone axe, a long tail, yellow eyes.",
  pal=[("#140806","negro"),("#5a1410","rojo oscuro"),("#b02a20","rojo"),("#3a3a40","hierro"),("#e0d0b0","hueso"),("#ffd24a","ojos")], cell=(119,119), ch=100,
  imgs=[dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 2, "hurt"), W("muerte: cae de rodillas y se desploma", 5, "death: falls to his knees and collapses")])])
for key, nm, en, d_es, d_en, pal in [
  ("esqueleto", "Esqueleto", "Skeleton", "un ESQUELETO con cuernos, escudo redondo de madera y espada corta", "a horned SKELETON with a round wooden shield and a short sword", [("#1a1612","sombra"),("#ece4cc","hueso"),("#8a5a2a","madera"),("#9fb4c8","acero")]),
  ("demonio_menor", "Demonio Menor", "Lesser Demon", "un DEMONIO MENOR rojo, bajo y panzón, con cuernos cortos y una clava de hueso", "a short, pot-bellied red LESSER DEMON with short horns and a bone club", [("#1a0806","sombra"),("#b0301a","rojo"),("#e05a2a","rojo claro"),("#e0d0b0","hueso")]),
  ("demonio_mago", "Demonio Hechicero", "Demon Sorcerer", "un DEMONIO HECHICERO de túnica violeta con capucha, piel roja y un báculo con una llama en la punta", "a DEMON SORCERER in a hooded violet robe, red skin and a staff with a flame on top", [("#140a14","sombra"),("#5a2a6a","violeta"),("#b0301a","piel roja"),("#ffb040","llama")]),
  ("lobo_artico", "Lobo Ártico", "Arctic Wolf", "un LOBO ÁRTICO blanco y celeste, pelaje erizado con escarcha, ojos celestes", "a white and pale blue ARCTIC WOLF, frost-bristled fur, pale blue eyes", [("#1a2430","sombra"),("#cfe4ee","pelaje"),("#8fb4c8","gris azul"),("#bfe8ff","ojos")]),
]:
    keep(id="F-04", key=key, name=nm, name_en=en, arena="10 · Infernal / 05 · Gélida", rank="Común / élite",
      role="—", why="Se MANTIENE: camina y ataca con arte real; le faltan golpe y muerte propios (I-1).",
      desc_es=d_es + ", del atlas infernal (celda 119×119).", desc_en=d_en + ", from the infernal atlas (119×119 cell).", pal=pal, cell=(119,119), ch=90, imgs=[HD()])
keep(id="F-05", key="kraken_joven", name="Kraken Joven y Leviatán", name_en="Young Kraken and Leviathan", arena="06 · Arena Acuática", rank="Subjefe / jefe",
  role="Jefes con tentáculos y mecánicas propias.", why="Se MANTIENEN (mecánicas atadas al cuerpo). Les faltan cuadros de ataque: el Kraken ataca con el quieto (I-4).",
  desc_es="el KRAKEN JOVEN: pulpo gigante violeta y carmesí con ventosas claras, ojos amarillos enormes, ocho tentáculos que asoman del agua oscura.",
  desc_en="the YOUNG KRAKEN: a giant violet and crimson octopus with pale suckers, huge yellow eyes, eight tentacles rising from dark water.",
  pal=[("#140a1a","sombra"),("#4a2a5a","violeta"),("#6a3a6e","violeta claro"),("#c98fe0","ventosas"),("#ffd24a","ojos")], cell=(128,96), ch=70,
  imgs=[dict(t_es="ataque con tentáculos", t_en="tentacle attack", parts=[W("levanta dos tentáculos", 2, "raises two tentacles"), W("golpea hacia adelante", 2, "slams forward")])])
for key, nm, en, d_es, d_en, pal in [
  ("cm_saqueador", "Saqueador Maldito", "Cursed Looter", "un SAQUEADOR MALDITO: ciudadano corrompido, ropa de trabajo rota, piel grisácea con venas rojas, un cuchillo de carnicero y una bolsa de botín", "a CURSED LOOTER: a corrupted citizen in torn work clothes, greyish skin with red veins, a butcher knife and a loot sack", [("#1a1012","sombra"),("#5a3a30","ropa"),("#8a3030","rojo"),("#a09088","piel gris")]),
  ("cm_perro", "Perro del Albañal", "Sewer Hound", "un PERRO DEL ALBAÑAL: perro deforme y flaco, sin pelo en partes, costillas marcadas, ojos rojos, baba", "a SEWER HOUND: a thin deformed dog, patchy hairless skin, visible ribs, red eyes, drool", [("#140c0c","sombra"),("#6a3a3a","piel"),("#9a6a5a","carne"),("#e02020","ojos")]),
  ("cm_raptor", "Raptor", "Raptor", "un RAPTOR: criatura encorvada de brazos largos y garras, capucha negra rasgada, que agarra civiles y se los lleva", "a RAPTOR: a hunched creature with long arms and claws, a torn black hood, that grabs civilians and carries them away", [("#120a0e","sombra"),("#3a2a30","capucha"),("#a04040","rojo"),("#c0b0a0","garras")]),
  ("cm_verdugo", "Verdugo", "Executioner", "un VERDUGO colosal: capucha negra de verdugo, torso desnudo enorme lleno de cicatrices, hacha gigante, cadenas en la cintura", "a colossal EXECUTIONER: black executioner's hood, huge scarred bare torso, a giant axe, chains at the waist", [("#120a0a","sombra"),("#2a1a1a","capucha"),("#8a5a4a","piel"),("#7a2a2a","sangre"),("#8a8a90","hacha")]),
  ("cm_planidera", "Plañidera", "Mourner", "una PLAÑIDERA: espíritu de mujer con velo de luto negro y vestido largo gris, manos en la cara, lágrimas de luz roja, flota", "a MOURNER: a female spirit in a black mourning veil and long grey dress, hands on her face, tears of red light, floating", [("#120a10","sombra"),("#3a3040","vestido"),("#c05060","luz roja"),("#d8d0d8","piel pálida")]),
  ("cm_acechante", "Acechante de los Tejados", "Rooftop Stalker", "un ACECHANTE DE LOS TEJADOS: criatura flaca y ágil tipo gárgola sin alas, piel morada oscura, garras largas, se agazapa", "a ROOFTOP STALKER: a thin, agile wingless gargoyle-like creature, dark purple skin, long claws, crouching", [("#100a10","sombra"),("#3a2040","piel"),("#9a3040","rojo"),("#c0b0c0","garras")]),
  ("cm_sectario", "Sectario Fanático", "Fanatic Cultist", "un SECTARIO FANÁTICO: túnica roja con capucha y máscara de teatro sonriente, bombas de pólvora atadas al pecho", "a FANATIC CULTIST: a hooded red robe and a smiling theater mask, gunpowder bombs strapped to the chest", [("#120808","sombra"),("#b02020","túnica"),("#e0d0c0","máscara"),("#ffb040","mecha")]),
  ("cm_campanero", "Campanero", "Bell Ringer", "un CAMPANERO: jorobado gordo con hábito marrón, una campana de bronce colgada a la espalda y un mazo", "a BELL RINGER: a fat hunchback in a brown habit, a bronze bell hanging on his back and a mallet", [("#140c08","sombra"),("#5a3a20","hábito"),("#b06030","bronce"),("#c0a080","piel")]),
  ("cm_espectro", "Espectro Ciudadano", "Citizen Wraith", "un ESPECTRO CIUDADANO: alma traslúcida celeste de un vecino, ropa antigua deshilachada, boca abierta, sin piernas", "a CITIZEN WRAITH: a translucent pale blue soul of a townsperson, frayed old clothes, open mouth, no legs", [("#0a1220","sombra"),("#3a5a8a","azul"),("#7ab0e0","celeste"),("#e0f0ff","brillo")]),
]:
    keep(id="F-06", key=key, name=nm, name_en=en, arena="01 · Ciudad Maldita", rank="Común / subélite / élite",
      role="—", why="Se MANTIENE (se mueve y ataca con arte real y tiene muerte). Es arte de 16–37 px dibujado a 2–3 veces con caminata de 2 cuadros (C-1): redibujar al doble.",
      desc_es=d_es + ".", desc_en=d_en + ".", pal=pal, cell=(64,80), ch=60,
      imgs=[dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar de perfil", 6, "side walk")]),
            dict(t_es="ataque", t_en="attack", parts=[W("ataque", 4, "attack")]),
            dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte", 4, "death")]),
            dict(t_es="caminar de frente y de espaldas", t_en="walk toward and away from camera", dir="D", loop=True, parts=[W("de frente", 4, "toward the camera"), W("de espaldas", 4, "away from the camera")])])
for key, nm, en, d_es, d_en, pal in [
  ("ab_errante", "Errante del Vacío", "Void Wanderer", "un ERRANTE DEL VACÍO: cadáver alto y encorvado de los que cayeron al Abismo, harapos morados, piel gris, grietas violetas que brillan", "a VOID WANDERER: a tall hunched corpse of those who fell into the Abyss, purple rags, grey skin, glowing violet cracks", [("#0e0a12","sombra"),("#3a2a3a","harapos"),("#8a4a6a","morado"),("#b070ff","grietas")]),
  ("ab_acechador", "Acechador del Borde", "Edge Stalker", "un ACECHADOR DEL BORDE: criatura de cuatro patas pegada al piso, cuerpo negro y violeta, garras de gancho, ojos violetas", "an EDGE STALKER: a low four-legged creature, black and violet body, hook claws, violet eyes", [("#0a0810","sombra"),("#2a1a3a","cuerpo"),("#7a4ad0","violeta"),("#d0a0ff","ojos")]),
  ("ab_heraldo", "Heraldo del Ojo", "Herald of the Eye", "un HERALDO DEL OJO: figura encapuchada que flota, túnica violeta, un ojo enorme en el pecho que brilla", "a HERALD OF THE EYE: a floating hooded figure in a violet robe with a huge glowing eye on its chest", [("#0e0a14","sombra"),("#4a2a6a","túnica"),("#b050ff","violeta"),("#ffe0ff","ojo")]),
  ("ab_devorador", "Devorador de Piedra", "Stone Devourer", "un DEVORADOR DE PIEDRA: masa de ruinas vivientes, rocas fusionadas con una boca violeta brillante, brazos de piedra", "a STONE DEVOURER: a mass of living ruins, fused rocks with a glowing violet maw, stone arms", [("#100c10","sombra"),("#4a3a3a","piedra"),("#8a6a5a","roca"),("#c060ff","brillo")]),
  ("ab_tejedor", "Tejedor del Vacío", "Void Weaver", "un TEJEDOR DEL VACÍO: araña grande de patas finas, cuerpo negro con marcas violetas, hilos de energía violeta", "a VOID WEAVER: a large thin-legged spider, black body with violet markings, strands of violet energy", [("#0a0810","sombra"),("#2a1a2a","cuerpo"),("#c060e0","violeta"),("#f0c0ff","hilos")]),
]:
    keep(id="F-07", key=key, name=nm, name_en=en, arena="08 · Abismo", rank="Común / subélite / élite",
      role="—", why="Se MANTIENE (se mueve y ataca con arte real). Caminata de 2 cuadros y arte a 1,3–2,4 veces (C-1): redibujar al doble.",
      desc_es=d_es + ".", desc_en=d_en + ".", pal=pal, cell=(80,80), ch=64,
      imgs=[dict(t_es="caminar", t_en="walk", loop=True, parts=[W("caminar de perfil", 6, "side walk")]),
            dict(t_es="ataque", t_en="attack", parts=[W("ataque", 4, "attack")]),
            dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte", 4, "death")])])
keep(id="F-08", key="escorpion_gigante", name="Escorpión Gigante", name_en="Giant Scorpion", arena="07 · Laberinto", rank="Común",
  role="Cuerpo a cuerpo rápido en grupo.", why="Se MANTIENE (tiene caminar y ataque). Arte con ruido y sin golpe ni muerte (I-5).",
  desc_es="un ESCORPIÓN GIGANTE del desierto: caparazón color arena y ámbar, pinzas grandes, cola arqueada con aguijón que gotea veneno verde.",
  desc_en="a GIANT desert SCORPION: sand and amber carapace, large pincers, an arched tail with a stinger dripping green venom.",
  pal=[("#1e140a","sombra"),("#8a6a2e","caparazón"),("#c99a4a","arena"),("#e0c070","claro"),("#7ae060","veneno")], cell=(64,56), ch=40,
  imgs=[dict(t_es="golpe recibido y muerte", t_en="hurt and death", parts=[W("golpe recibido", 1, "hurt"), W("muerte: se da vuelta, patas al aire", 3, "death: flips over, legs in the air")])])

for i, c in enumerate(K): c["id"] = "F-%02d" % (i + 1)
# ---------------------------------------------------------------- documento
L = []
A = L.append
A("# LA HORDA — Encargo de arte para personajes (playtest y alfa)")
A("")
A("> Para el dueño. Qué personajes no tienen arte completo para animarse, qué se hizo mientras tanto para que en el")
A("> playtest nadie vea un personaje \"tieso\", y los **prompts listos para copiar** (uno por imagen) para pedir cada")
A("> hoja a un artista o a ChatGPT. Ordenado por prioridad: primero lo que se ve en el playtest.")
A("")
A("## Cómo quedó para el playtest")
A("")
A("- **Reemplazos temporales (cuerpos prestados):** cada personaje de la tabla de abajo se dibuja con el cuerpo **completo** de otro")
A("  personaje del juego que cumple el mismo papel, recoloreado con la paleta de su arena. La IA, las mecánicas, la vida y el daño")
A("  son los del original; solo cambia el dibujo (y el nombre cuando el cuerpo nuevo ya no corresponde).")
A("- **Todo está en un solo archivo:** `js/data/body-swaps.js`. Cuando llegue el arte nuevo de un personaje, se **borra su entrada**")
A("  y vuelve solo a su dibujo y a su nombre original. Para comparar en vivo: abrir el juego con `?bodyswap=0` en la dirección.")
A("- Son 13 personajes (16 entradas: los tres actos del Presentador y el Espejismo de la Dama van aparte). Medido con")
A("  `tools/art/enemy_coverage.js` antes y después, y con `tools/art/t_body_swaps.js`: todos caminan con 3 a 6 cuadros reales,")
A("  atacan con cuadros distintos de la caminata y tienen golpe (salvo el Maestro, que clona el quieto); todos menos la Sirena y el")
A("  Maestro tienen además muerte en cuadros (esos dos caen con la animación genérica de muerte).")
A("")
A("| # | Personaje (arena) | Problema hoy | Cuerpo prestado mientras tanto | Nombre en el juego |")
A("|---|---|---|---|---|")
for c in C:
    nm = {"tiburon_joven": "Ahogado de las Ruinas", "tiburon_blanco": "Tritón de las Fosas", "cangrejo_acorazado": "Cangrejo Araña"}.get(c["key"], c["name"])
    A(f"| {c['id']} | **{c['name']}** ({c['arena']}) | {c['hoy']} | {c['temp']} | {nm} |")
A("")
A("**Se mantienen sin reemplazo** (tienen animación, solo les falta calidad o algún estado; reemplazarlos rompería algo central):")
A("Cerbero (mecánicas de cadenas y tres cabezas, 8+ cuadros por estado), Ángel Corrompido (animación completa, recoloreado),")
A("Rey de la Horda (le faltan golpe y muerte), Kraken Joven y Leviatán (tentáculos y reglas atadas al cuerpo), los comunes de la")
A("Ciudad y del Abismo (caminata de 2 cuadros pero con ataque, golpe y muerte), Madre Espora y El Que Mora Debajo (se dibujan")
A("por partes con el escenario). Sus fichas están al final (sección F).")
A("")
A("## Cómo usar los prompts (ChatGPT u otra IA de imágenes)")
A("")
A("1. **Primero** pegá el prompt **0 — Hoja de estilo** y guardá la imagen: es la referencia general del juego.")
A("2. Para cada personaje, pegá los prompts **en orden** (1/N, 2/N...). Cada prompt pide **una sola imagen** con **una sola fila**")
A("   de cuadros. Desde el prompt 2, **adjuntá la imagen 1 del mismo personaje** (y la hoja de estilo) y dejá la frase")
A("   \"usá la imagen anterior como referencia exacta\": así sale el mismo personaje en todas.")
A("3. Si la IA devuelve una imagen grande (1024 px o más), está bien: se reduce con \"vecino más cercano\" al tamaño de celda.")
A("   Lo importante es que los cuadros estén en **una fila**, del **mismo tamaño**, con los **pies a la misma altura**.")
A("4. Fondo: transparente. Si la IA no puede, magenta plano `#FF00FF` (se recorta solo). Nunca \"ajedrez\" pintado.")
A("5. Entregá las imágenes con el nombre `<clave>_<n>.png` (por ejemplo `cm_presentador_3.png`); la clave está en cada ficha.")
A("")
A("Convenciones del juego (`LA_HORDA_MISSING_ASSETS.md`): 1 px de arte = 2 unidades de mundo; un guardián mide ≈32–36 px de arte.")
A("\"Perfil\" se dibuja mirando a la derecha y el juego lo espeja. Los tamaños de celda de abajo están al doble de esa escala")
A("para que el personaje tenga detalle; el juego lo reduce.")
A("")
A("### Prompt 0 — Hoja de estilo (referencia general)")
A("")
A("```text")
A("PROMPT 0 — HOJA DE ESTILO DE «LA HORDA»")
A("Una lámina de referencia de estilo para un videojuego ARPG cooperativo de fantasía oscura. Mostrá, en una sola fila y del mismo tamaño,")
A("cinco personajes de ejemplo parados de perfil mirando a la derecha: un guerrero con armadura gastada, una hechicera encapuchada, un")
A("esqueleto con escudo, un demonio rojo menor y un gólem de piedra. Al lado, una tira de 8 muestras de color de la paleta general:")
A("#0e0a12 (negro violáceo), #3a2a30 (sombra cálida), #7a2a2a (sangre), #c0503a (brasa), #e8c27a (oro viejo), #8a9a8a (piedra),")
A("#4a78a8 (acero azul), #efe6d6 (hueso).")
A("Vista cenital 3/4 (cámara desde arriba en diagonal), luz desde arriba a la izquierda, contorno oscuro de 1 píxel en todos los personajes,")
A("sombras en 3–4 tonos por color, sin degradés suaves. Guerrero ≈64 px de alto; los demás a su escala relativa.")
A("Fondo transparente (o magenta plano #FF00FF). Sin texto, sin números, sin marcos, sin escenario.")
A("Estilo: pixel art 16-bit de fantasía oscura, detallado, píxeles nítidos, sin desenfoque, sin antialiasing, paleta limitada, silueta fuerte.")
A("```")
A("")
A("<details><summary>English version</summary>")
A("")
A("```text")
A("PROMPT 0 — «LA HORDA» STYLE SHEET")
A("A style reference plate for a dark-fantasy co-op ARPG. Show, in a single row and at the same scale, five example characters standing in")
A("side view facing right: a warrior in worn armor, a hooded sorceress, a skeleton with a shield, a lesser red demon and a stone golem.")
A("Next to them, a strip of 8 color swatches of the general palette: #0e0a12 (violet black), #3a2a30 (warm shadow), #7a2a2a (blood),")
A("#c0503a (ember), #e8c27a (old gold), #8a9a8a (stone), #4a78a8 (steel blue), #efe6d6 (bone).")
A("Top-down 3/4 view (camera from above at an angle), light from the top left, 1-pixel dark outline on every character, 3–4 shade steps per")
A("color, no soft gradients. Warrior about 64 px tall; the rest at relative scale.")
A("Transparent background (or flat magenta #FF00FF). No text, no numbers, no borders, no scenery.")
A("Style: dark-fantasy detailed 16-bit pixel art, crisp pixels, no blur, no anti-aliasing, limited palette, strong silhouette.")
A("```")
A("")
A("</details>")
A("")

def ficha(c, reemplazo=True):
    A(f"### {c['id']} · {c['name']} — `{c['key']}`")
    A("")
    A("| Campo | Valor |")
    A("|---|---|")
    A(f"| Arena | {c['arena']} |")
    A(f"| Rango | {c['rank']} |")
    A(f"| Rol en combate | {c['role']} |")
    if reemplazo:
        A(f"| Problema hoy | {c['hoy']} |")
        A(f"| Mientras tanto | {c['temp']} |")
    else:
        A(f"| Por qué no se reemplazó | {c['why']} |")
    A(f"| Paleta | {pal_str(c['pal'])} |")
    A(f"| Celda | {c['cell'][0]}×{c['cell'][1]} px (personaje ≈{c['ch']} px de alto) |")
    A(f"| Entrega | `{c['key']}_1.png` … `{c['key']}_{len(c['imgs'])}.png`, una fila por imagen |")
    A("")
    A(f"**Descripción visual:** {c['desc_es'][0].upper() + c['desc_es'][1:]}")
    A("")
    A("**Planilla de animaciones** (estado × dirección × cuadros):")
    A("")
    A(planilla(c))
    A("")
    for es, en in prompt_blocks(c):
        A("```text"); A(es); A("```"); A("")
        A("<details><summary>English</summary>"); A(""); A("```text"); A(en); A("```"); A(""); A("</details>"); A("")

A("## P0 — Personajes reemplazados para el playtest (en orden de prioridad)")
A("")
A("Orden de campaña, que es el orden en que se ven en el playtest: Ciudad (Arena 01), Acuática (06), Abismo (08) y el jefe final (10).")
A("")
A("> Si hay que elegir **una sola** cosa para el playtest: la Ciudad (P0-01 a P0-04), porque es la primera arena que se juega.")
A("")
for c in C:
    if c["id"].startswith("P0"): ficha(c)
A("## P1 — Reemplazado, menos visible")
A("")
for c in C:
    if c["id"].startswith("P1"): ficha(c)
A("## F — Faltantes que se mantienen (sin reemplazo)")
A("")
A("Tienen animación suficiente para no verse tiesos; se listan para completar el encargo. Mismo formato: prompts de una fila.")
A("")
for c in K: ficha(c, reemplazo=False)
A("---")
A("")
A("Generado para la tarea T10 (playtest). Fuente de los datos: `js/data/body-swaps.js`, `tools/art/enemy_coverage.js`,")
A("`LA_HORDA_MISSING_ASSETS.md` (sección \"Actualización S5\"), el Códice (`js/data/codex-content.js`) y la biblia de lore")
A("(`docs/lore/LA_HORDA_LORE_BIBLE.md`).")
open(OUT, "w").write("\n".join(L) + "\n")
print("ok", len(L), "líneas", sum(len(c["imgs"]) for c in C + K), "prompts")
