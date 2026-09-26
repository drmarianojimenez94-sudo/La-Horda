"""Registro de CANON visual de LA HORDA -> LA_HORDA_SPRITE_CANON.md y LA_HORDA_ARTGATE_AUDIT.md.
Una sola fuente de datos para las dos: si cambia una decisión de canon, se edita acá y se regenera.
usage: python3 tools/art/canon_registry.py
Estados: USE · CANONICAL_SET · REPLACE_FULL_SET · PARTIAL_USE · CANON_SELECTED_BUT_INCOMPLETE ·
REJECT_INCONSISTENT · DUPLICATE (ver el pedido de Artgate)."""
import os
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# Hojas analizadas en este pase
SHEETS = {
    'H12': 'art-source/hielo_jefes/mago_hielo_cristal_sheet.png (12 · Mago de Hielo y Cristal + Gólem de Cristal + esbirros)',
    'H13': 'art-source/hielo_jefes/angel_caido_hielo_sheet.png (13 · Ángel Caído de Hielo)',
    'HMI': 'art-source/hielo_jefes/minotauro_sheet.png (Minotauro de capa roja + fuego)',
    'HI4': 'art-source/hielo_jefes/jefes_I1_I4_sheet.png (I1 Jinete · I2 Mago · I3 Ángel · I4 Tundraverx, versión resumida)',
    'P79': 'art-source/pack_canon/img7_img9_profeta_nigro_minotauro.png (IMG 7 reexports Profeta/Nigromante · IMG 9 Minotauro)',
    'P56': 'art-source/pack_canon/img5_img6_campeones_b_vfx.png (IMG 5 campeones B y ajustes · IMG 6 VFX)',
    'P34': 'art-source/pack_canon/img3_img4_bosque_campeones_a.png (IMG 3 bosque y elementales · IMG 4 campeones A)',
    'P13': 'art-source/pack_canon/img1_img3_laberinto_hielo_bosque.png (IMG 1 laberinto · IMG 2 y 3 versiones cortas)',
    'P2':  'art-source/pack_canon/img2_hielo_menores.png (IMG 2 hielo menores, versión completa)',
}

E = []  # entidades
def ent(**k): E.append(k)

# ---------------- GUARDIANES ----------------
ent(entity='Mago de Hielo y Cristal (GUARDIÁN: el Mago Gélido, uno de los Cuatro)', guardian=True,
    canon='art-source/hielo_jefes/mago_hielo_cristal_sheet.png → assets/sprites/bosses/hielo/mago_hielo_cristal/v2/atlas.png',
    status='CANONICAL_SET · REPLACE_FULL_SET', artgate='PASS (probado en partida: legible sobre el hielo, silueta propia de corona de cristal + bastón)',
    available='idle 4 · caminar 5 (perfil) · básico 3 · lanza 4 · nova 3 · canalización 4 · encierro de hielo 4 · muro 3 · muerte 3',
    missing='hurt dedicado (hoy usa un cuadro de la nova) · vista de espaldas/frente al caminar (la hoja trae espalda y perfil sueltos, sin ciclo)',
    vfx='lanza de cristal (proyectil real), runa bajo la Ventisca, estallido, impacto, muro, cristal flotante',
    alternatives='jefes_I1_I4_sheet.png fila I2 (versión resumida del mismo mago) · static.png viejo (1 cuadro)',
    rejected='jefes_I1_I4 fila I2 → DUPLICATE (mismo diseño, menos animaciones) · static.png → reemplazado',
    notes='GUARDIAN_CANON. Toda animación futura del Mago Gélido se pide sobre esta hoja. El static.png queda solo como respaldo si el atlas no carga.')
ent(entity='Guardián del Laberinto (GUARDIÁN)', guardian=True, canon='assets/sprites/bosses/laberinto/guardian_laberinto/ (Pack 3, integrado antes)',
    status='USE (sin cambios)', artgate='PASS', available='idle 3 · caminar 4 · ataque 5 · golpe 2 · muerte 5', missing='habilidades propias con arte (hoy efectos de código)',
    vfx='de código', alternatives='ninguna en este lote', rejected='—', notes='GUARDIAN_CANON vigente. No vino arte nuevo.')
ent(entity='Guardián Élfico (GUARDIÁN)', guardian=True, canon='— (no existe arte)', status='FALTA TOTAL', artgate='—', available='—',
    missing='set completo (idle, caminar 4 dir, ataque, 2 habilidades, hurt, muerte, retrato)', vfx='—', alternatives='—', rejected='—',
    notes='Solo aparece en el mural de los Cuatro. Es el próximo Guardián a producir: una sola hoja completa.')
ent(entity='El Hechicero (GUARDIÁN, sin revelar)', guardian=True, canon='assets/sprites/bosses/infernal/hechicero/atlas.png (integrado en H1)',
    status='USE (sin cambios)', artgate='PASS', available='idle 4 · caminar 12 · conjuro 8 · básico 4 · daño 5 · muerte 6 + Gólem de Cuerpos',
    missing='—', vfx='orbe, pilares, juicio, meteoros', alternatives='—', rejected='—', notes='GUARDIAN_CANON vigente.')

# ---------------- JEFES ----------------
ent(entity='Ángel Caído de Hielo (jefe de Hielo, fase 2)', canon='art-source/hielo_jefes/angel_caido_hielo_sheet.png → .../angel_caido_hielo/v2/atlas.png',
    status='CANONICAL_SET · REPLACE_FULL_SET', artgate='PASS (probado en partida)',
    available='idle 4 · caminar 5 · ataque 4 · vuelo 4 · preparación 4 · alas 3 · tormenta 4 · transformación 5 · aura 4 · congelación 3 · recuperación 4 · muerte 8',
    missing='vista de espaldas animada (hay 1 cuadro) · golpe descendente (el recorte trae la estela pegada; no se usa)',
    vfx='nova (Alas de Ventisca), pilar, runa, estallido, impacto, muros',
    alternatives='jefes_I1_I4 fila I3 · static.png viejo (gárgola azul)', rejected='fila I3 → DUPLICATE · gárgola → reemplazada (el nombre pide un ángel)',
    notes='Distinto del Ángel de Hielo élite: el jefe lleva espada y armadura; el élite, capucha y bastón.')
ent(entity='Jinete Sin Cabeza (jefe del Bosque)', canon='art-source/hielo_jefes/jefes_I1_I4_sheet.png fila I1 → .../jinete_sin_cabeza/v2/atlas.png',
    status='CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET', artgate='PASS (más oscuro y borroso que el resto: aceptable a su escala)',
    available='galope de perfil 4 · ataque 3 · muerte 5 · frente 3', missing='hurt · pose de "Resurrección Eterna" · espalda animada',
    vfx='— (usa los de código: calabazas, guadaña)', alternatives='static.png (caballo pálido, 1 cuadro) · Pack 2 (caballo negro con cabeza en llamas, rechazado antes)',
    rejected='static.png → reemplazado', notes='El diseño nuevo (llamas azules) reemplaza al caballo pálido.')
ent(entity='Minotauro (jefe del Laberinto)', canon='art-source/pack_canon/img7_img9 · IMG 9 → assets/sprites/bosses/laberinto/minotauro/v3/atlas.png',
    status='CANONICAL_SET · REPLACE_FULL_SET', artgate='PASS',
    available='idle frente/derecha/espalda/izquierda 4 c/u · caminar 4 · carrera 4 · ataque básico 4 · golpe pesado 4 · golpe sísmico 4 · embestida 4 · hurt 2 · muerte 4',
    missing='—', vfx='onda sísmica, impacto de hacha, polvo/rocas, traza de embestida, aura de furia',
    alternatives='walk-strip.png (capa oscura, sin hacha) · minotauro_sheet.png (capa roja + hacha, solo frente/ataque) · IMG 1 muerte (marrón)',
    rejected='walk-strip → reemplazado (sin ataque ni muerte) · minotauro_sheet cuerpo → REJECT_INCONSISTENT (otro diseño, incompleto) · IMG 1 muerte → REJECT_INCONSISTENT (otro diseño)',
    notes='El único set completo con las 4 direcciones: pasa a canon y se reemplaza TODO (cuerpo y efectos).')
ent(entity='Tundraverx, Soberano de Hielo (élite/jefe intermedio)', canon='jefes_I1_I4_sheet.png fila I4 → assets/sprites/enemies/hielo/dragon_hielo/v2/atlas.png',
    status='CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET', artgate='PASS', available='caminar de perfil 4 · aliento 3 · muerte 5 · frente 2',
    missing='hurt · espalda animada', vfx='usa el aliento y la nova existentes', alternatives='static.png (dragón alado, 1 cuadro)',
    rejected='static.png → reemplazado', notes='Diseño nuevo sin alas: el lore de la Esquirla pasó de "ala" a "cresta".')

# ---------------- ENEMIGOS ----------------
ent(entity='Gólem de Cristal (guardián invocado por el Mago)', canon='hoja 12 → assets/sprites/enemies/hielo/golem_cristal/atlas.png', status='CANONICAL_SET (entidad nueva)',
    artgate='PASS', available='idle 2 · caminar 4 · golpe 4 · pisotón 4 · lanzamiento 2 · carga 3 · muerte 5', missing='—', vfx='—',
    alternatives='variantes de color de la hoja (opcionales)', rejected='variantes → no se usan (el Hielo ya tiene su paleta)', notes='Reemplaza al Gólem de Hielo como guardián del Mago.')
ent(entity='Servo de Cristal / Cristal Volador (esbirros del Mago)', canon='hoja 12 → .../cristal_servo y .../cristal_volador', status='CANONICAL_SET (entidades nuevas)',
    artgate='PASS', available='servo: idle 3 · caminar 4 · ataque 2 · muerte 3 — volador: idle 3 · movimiento 4 · ataque 4 · muerte 4', missing='hurt (ambos)',
    vfx='cristal flotante al aparecer', alternatives='—', rejected='—', notes='Nuevo patrón del Mago: Esbirros de Cristal (fases 2 y 3).')
ent(entity='Dragoncito de Hielo (élite)', canon='P2 (IMG 2 completa) → assets/sprites/enemies/hielo/dragoncito_hielo/v2/atlas.png', status='CANONICAL_SET · REPLACE_FULL_SET',
    artgate='PASS', available='vuelo 4 · ataque 3 · hurt 2 · muerte 4 · frente 4 · espalda 4', missing='—', vfx='proyectil de hielo, impacto',
    alternatives='P13 (IMG 2 corta: sin hurt/frente/espalda) · static.png (1 cuadro)', rejected='P13 → DUPLICATE · static.png → reemplazado', notes='')
ent(entity='Ángel de Hielo y Cristal (élite)', canon='P2 (IMG 2 completa) → assets/sprites/enemies/hielo/angel_hielo/v2/atlas.png', status='CANONICAL_SET · REPLACE_FULL_SET',
    artgate='PASS', available='vuelo 4 · ataque 3 · cast 4 · hurt 2 · muerte 4 · frente 4 · espalda 4', missing='—', vfx='proyectil de cristal, nova',
    alternatives='P13 (IMG 2 corta) · static.png (estatua con escudo, 1 cuadro)', rejected='P13 → DUPLICATE · static.png → reemplazado', notes='')
ent(entity='Enjambre de Hadas (minions del Bosque)', canon='P2 (IMG 2 completa) → assets/sprites/enemies/bosque/enjambre_hadas/v2/atlas.png', status='CANONICAL_SET · REPLACE_FULL_SET',
    artgate='PASS (hadas azules en el Bosque: se leen como magia fría, contrastan con el verde)', available='idle/vuelo 4 · direcciones 4 · ataque 3 · muerte 4', missing='hurt',
    vfx='proyectil, estallido', alternatives='P13 (IMG 2 corta) · static.png (1 cuadro) · variantes de color', rejected='P13 → DUPLICATE · variantes → no se usan', notes='')
ent(entity='Cù-Sìth (élite del Bosque)', canon='P34 (IMG 3 con hurt) → assets/sprites/enemies/bosque/cu_sith/v2/atlas.png', status='CANONICAL_SET · REPLACE_FULL_SET',
    artgate='PASS', available='corrida 4 · mordida 3 · hurt 2 · muerte 4', missing='idle propio (usa la corrida)', vfx='tajo de la mordida',
    alternatives='P13 (IMG 3 sin hurt) · static.png (1 cuadro)', rejected='P13 → DUPLICATE · static.png → reemplazado', notes='')
ent(entity='Gólem del Infernal ("Gólem")', canon='P34 IMG 3 "Gólem de Fuego" → assets/sprites/enemies/infernal/golem/v2/atlas.png', status='CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET',
    artgate='PASS (identidad de arena: el gólem de lava se lee como Infernal; el gris era el mismo que el del Laberinto)', available='idle/caminar 4 · ataque 2 · muerte 4',
    missing='hurt · ataque cuerpo a cuerpo de 3+ cuadros', vfx='proyectil de fuego, impacto', alternatives='atlas.png gris actual', rejected='gris → reemplazado', notes='')
ent(entity='Gólem de Piedra (subjefe del Laberinto)', canon='P13 IMG 1 → assets/sprites/enemies/laberinto/golem_piedra/v2/atlas.png', status='CANON_SELECTED_BUT_INCOMPLETE · REPLACE_FULL_SET',
    artgate='PASS', available='frente 2 · perfil derecho 3 · espalda 2 · perfil izquierdo 3 · caminar 5 · golpe 3', missing='hurt · muerte', vfx='impacto de rocas',
    alternatives='walk-strip.png (caminar)', rejected='walk-strip → reemplazado', notes='La muerte sigue siendo el derrumbe animado por código.')
ent(entity='Gólem de Hielo', canon='assets/sprites/enemies/hielo/golem_hielo/ (Pack 3)', status='USE (se conserva)', artgate='PASS', available='idle 2 · caminar 3 · ataque 4 · golpe 2 · muerte 4',
    missing='—', vfx='—', alternatives='P34 "Gólem de Hielo (variante)"', rejected='variante → DUPLICATE (menos animaciones; y el Hielo ya tiene el Gólem de Cristal azul oscuro: con la variante habría dos gólems iguales)', notes='')
ent(entity='Dama del Bosque (jefa)', canon='assets/sprites/enemies/bosque/dama_bosque/v2/atlas.png (redraw RD6)', status='USE (se conserva)', artgate='PASS',
    available='idle 4 · caminar 4 · ataque 4 · golpe 4 · muerte 6', missing='—', vfx='de código', alternatives='P34 "Dama del Bosque" (druida verde con astas)',
    rejected='P34 → REJECT_INCONSISTENT (otro diseño: cambiaría la identidad de una jefa ya completa)', notes='Sus VFX verdes (raíces, hojas) no combinan con la Dama roja/blanca: no se usan.')
ent(entity='Esfinge · Medusa · Druida de Arena (Laberinto)', canon='walk-strip.png actuales', status='USE (se conservan)', artgate='PASS', available='caminar de perfil',
    missing='muerte 4 · ataque · hurt', vfx='—', alternatives='P13 "Muertes - Arena Laberinto"',
    rejected='las 3 muertes → REJECT_INCONSISTENT: Esfinge con alas azules (la actual no tiene), Medusa de piel verde (la actual es de piel clara), Druida con astas (el actual es encapuchado). Mezclarlas sería un Frankenstein.',
    notes='Hace falta la hoja completa de cada uno (mismo diseño que el actual) — ver lista de faltantes.')

# ---------------- CAMPEONES ----------------
for name, cur, new in [
    ('Tanque (Caballero)', 'assets/sprites/champions/tanque/atlas.png (referencia maestra de la biblia de arte)', 'P34 IMG 4 Tanque'),
    ('Asesino / Segador Olvidado', 'guerrero/atlas.png y segador/v2/atlas.png', 'P34 IMG 4 Asesino'),
    ('Soporte (Curador)', 'soporte/atlas.png', 'P34 IMG 4 Soporte'),
    ('La Profeta', 'profeta/v2/atlas.png (redraw RD3)', 'P56 IMG 5 Profeta + P79 IMG 7 reexports'),
    ('La Cazadora (Sylva)', 'cazadora/v2/atlas.png (redraw RD5)', 'P56 IMG 5 Sylva'),
    ('Musashi', 'musashi/v2/atlas.png', 'P56 ajuste de ataque básico'),
    ('Nigromante', 'nigromante/v2/atlas.png', 'P56 idle limpio · P79 Demon Soul Slash · demonio slam'),
]:
    ent(entity=f'{name} (campeón)', canon=cur, status='USE (se conserva) · lo nuevo: PARTIAL_USE (solo VFX)',
        artgate='El canon actual PASS; la versión nueva REJECT_INCONSISTENT como cuerpo',
        available='set completo de 4 direcciones (idle/caminar abajo, perfil, izquierda, arriba) + ataque, cast, hurt, muerte',
        missing='según ficha del campeón', vfx='nuevos disponibles: ver auditoría (VFX por campeón)', alternatives=new,
        rejected=f'{new} → REJECT_INCONSISTENT: es otro diseño de personaje (proporciones realistas, otra cara/ropa/arma) frente al roster chibi de 13 campeones, y no trae las vistas de espaldas/izquierda que usa el juego. Cambiar uno solo rompe el roster.',
        notes='Si el equipo decide pasar TODO el roster al estilo realista, tiene que ser una hoja completa por campeón (las 4 direcciones), no campeón por campeón.')
ent(entity='Duende · Zombi · Lobo Espectral · Demonio Nigromántico (ajustes)', canon='packs actuales', status='USE (se conservan)', artgate='PASS',
    available='sets actuales', missing='Duende: 2º ataque · Zombi: ataque propio · Lobo: carrera · Demonio: golpe al suelo (pedidos viejos)', vfx='—',
    alternatives='P56 ajustes (duende ataque 1/2, zombi ataque, lobo carrera, demonio slam) · P79 Demon Soul Slash',
    rejected='→ REJECT_INCONSISTENT: los "ajustes" vienen redibujados con otro diseño (otra paleta/anatomía) y mezclarlos con el set actual cambia al personaje a mitad de animación.',
    notes='Se piden de nuevo como hoja completa del personaje (ver faltantes).')

# ---------------- VFX ----------------
VFX = [
    ('Minotauro (IMG 9)', 'onda sísmica, impacto de hacha, polvo/rocas, traza de embestida, aura de furia', 'USE — reemplazan al fuego/lava de minotauro_sheet (el canon trae los suyos)'),
    ('Mago Gélido (hoja 12)', 'lanza de cristal, estallido, runa, impacto, muro, cristal flotante', 'USE'),
    ('Ángel Caído (hoja 13)', 'nova, pilar, runa, estallido, impacto, muros', 'USE (nova en Alas de Ventisca; el resto en biblioteca)'),
    ('Dragoncito / Ángel élite / Hadas (IMG 2)', 'proyectiles e impactos de hielo', 'USE con su entidad'),
    ('Gólem de Fuego (IMG 3)', 'proyectil, impacto', 'USE con su entidad'),
    ('Gólem de Piedra (IMG 1)', 'impacto de rocas', 'USE con su entidad'),
    ('IMG 6 Mago (Nova anular, Cataclismo)', 'anillo de nova 14 cuadros · cataclismo 16 cuadros', 'PARTIAL_USE — biblioteca; no se engancharon a habilidades en este pase'),
    ('IMG 6 VFX globales', 'impacto físico/mágico, auras buff/debuff, teletransporte, curación, explosión elemental, congelación, rayo, círculo rúnico, bolas, partículas', 'PARTIAL_USE — biblioteca; pendiente asignar sin repetir identidades'),
    ('IMG 4 VFX Caballero/Asesino/Soporte', 'traza de espada, onda sísmica, torbellino, cortes, curación, sacrificio, resurrección', 'PARTIAL_USE — sin cuerpo nuevo; pendientes de asignar'),
    ('IMG 7 Profeta', 'halos del Destino, ojos de la Visión, cartas de la Danza, luz de la Ascensión', 'PARTIAL_USE — encajan con sus habilidades; pendientes de asignar'),
    ('minotauro_sheet (fuego/lava)', 'estela de fuego, anillo de lava', 'REJECT — no es el canon del Minotauro (se retiró de producción)'),
]

def render_entity(x):
    return '\n'.join([f"### {x['entity']}", '', '```',
        f"ENTITY:               {x['entity']}", f"CANON_ASSET:          {x['canon']}", f"STATUS:               {x['status']}",
        f"ARTGATE_STATUS:       {x['artgate']}", f"AVAILABLE_ANIMATIONS: {x['available']}", f"MISSING_ANIMATIONS:   {x['missing']}",
        f"VFX:                  {x['vfx']}", f"ALTERNATIVE_ASSETS:   {x['alternatives']}", f"REJECTED_ASSETS / REJECTION_REASON: {x['rejected']}",
        f"NOTES:                {x['notes']}", '```', ''])

if __name__ == '__main__':
    g = [x for x in E if x.get('guardian')]; o = [x for x in E if not x.get('guardian')]
    C = ['# LA HORDA — Canon visual de sprites', '',
         '> Generado con `python3 tools/art/canon_registry.py`. Una vez elegido el canon de una entidad, **toda animación futura se pide sobre ese canon** y no se mezclan frames de otra representación (regla NO FRANKENSTEIN).', '',
         'Estética objetivo: dark-fantasy detailed 16-bit pixel art (ver `docs/ART_BIBLE.md`). Prioridad: ARTGATE → COHERENCIA → COMPLETITUD → LEGIBILIDAD → IDENTIDAD → INTEGRACIÓN.', '',
         '## Guardianes (GUARDIAN_CANON)', ''] + [render_entity(x) for x in g] + ['## Jefes, enemigos y campeones', ''] + [render_entity(x) for x in o]
    open(os.path.join(REPO, 'LA_HORDA_SPRITE_CANON.md'), 'w').write('\n'.join(C) + '\n')
    A = ['# LA HORDA — Auditoría de Artgate (hojas nuevas)', '', '## Hojas analizadas', '']
    A += [f"- **{k}** — {v}" for k, v in SHEETS.items()]
    def rows(pred):
        return [f"| {x['entity']} | {x['status']} | {x['canon']} | {x['rejected']} |" for x in E if pred(x)]
    A += ['', '## Canon seleccionado y reemplazos', '', '| Entidad | Decisión | Canon | Alternativas descartadas |', '|---|---|---|---|']
    A += rows(lambda x: 'CANON' in x['status'] or 'REPLACE' in x['status'])
    A += ['', '## Conservados (el actual es mejor o está completo)', '', '| Entidad | Decisión | Canon | Qué se descartó y por qué |', '|---|---|---|---|']
    A += rows(lambda x: x['status'].startswith('USE') or 'FALTA' in x['status'])
    A += ['', '## VFX', '', '| Origen | Contenido | Decisión |', '|---|---|---|'] + [f"| {a} | {b} | {c} |" for a, b, c in VFX]
    A += ['', '## Guardianes definidos como canon', ''] + [f"- **{x['entity']}** — {x['canon']} ({x['status']})" for x in g]
    A += ['', '## Animaciones todavía faltantes (del canon elegido)', ''] + [f"- **{x['entity']}:** {x['missing']}" for x in E if x['missing'] not in ('—', '')]
    A += ['', '## Problemas encontrados durante la integración', '',
          '- Las hojas con fondo liso oscuro no se pueden recortar con un umbral de color: el halo azul de los personajes de hielo es casi del mismo tono que el fondo. Se resolvió con una máscara por cuadro (u2net) y, para muertes/partículas, con la máscara directa + alfa de brillo.',
          '- Las hojas del pack de canon traen cada cuadro dentro de una celda más clara: con celdas parejas se recorta celda por celda; con celdas irregulares, por figuras con un fondo estimado en una ventana ancha.',
          '- Algunos cuadros vienen con la estela del golpe pegada al cuerpo (golpe descendente del Ángel, ataque 2 del Gólem de Cristal): se usan los cuadros limpios y la estela queda para biblioteca.',
          '- Los "ajustes" de campeones y enemigos existentes vienen redibujados con otro diseño: no se integran (no Frankenstein) y se vuelven a pedir como hoja completa.',
          '- Varias hojas tienen versiones repetidas (IMG 2 e IMG 3 aparecen dos veces): se usa la más completa y la otra queda como DUPLICATE.']
    open(os.path.join(REPO, 'LA_HORDA_ARTGATE_AUDIT.md'), 'w').write('\n'.join(A) + '\n')
    print(len(E), 'entidades')
