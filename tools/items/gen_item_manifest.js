// Genera LA_HORDA_ITEM_ASSET_MANIFEST.md desde los datos REALES del juego (no a mano), para que
// el manifiesto nunca se desincronice del catálogo. Cada asset: objeto, categoría, rareza, slot
// real, set, arena/fuente, formato, descripción visual y prompt de producción.
//   (python3 -m http.server 8771 &) ; node tools/items/gen_item_manifest.js
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright')); }
const fs = require('fs'), path = require('path');
const BASE = process.env.SE_BASE_URL || 'http://127.0.0.1:8771';
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const D = await page.evaluate(() => {
    const arenaLabel = a => (ARENA_MODS[a] && ARENA_MODS[a].label) || a;
    const topArenas = w => Object.keys(w || {}).sort((a, b) => w[b] - w[a]).slice(0, 2).map(arenaLabel).join(', ');
    const setArenas = id => { const w = {}; for (const a in SET_ARENA_WEIGHTS) if (SET_ARENA_WEIGHTS[a][id]) w[a] = SET_ARENA_WEIGHTS[a][id]; return topArenas(w); };
    const matName = { fire: 'fuego (rojo brasa, naranja, amarillo)', ice: 'hielo (azul glaciar, celeste, blanco)', lightning: 'rayo (amarillo eléctrico, blanco)', bleed: 'sangre (carmesí, rojo oscuro)',
      holy: 'luz sagrada (dorado, marfil)', arcane: 'arcano (violeta, lila)', rot: 'podredumbre fúngica (púrpura, verde espora)', physical: 'acero (gris azulado)', leather: 'cuero (marrón)', cloth: 'tela (violeta apagado)' };
    const matEn = { fire: 'fire (ember red, orange, yellow)', ice: 'ice (glacier blue, cyan, white)', lightning: 'lightning (electric yellow, white)', bleed: 'blood (crimson, dark red)',
      holy: 'holy light (gold, ivory)', arcane: 'arcane (violet, lilac)', rot: 'fungal rot (purple, spore green)', physical: 'steel (bluish grey)', leather: 'leather (brown)', cloth: 'cloth (muted violet)' };
    const matKey = it => { const m = itemIconMaterial(it); for (const k in ICON_MATERIAL) if (ICON_MATERIAL[k] === m) return k; return null; };
    const matOf = it => { const k = matKey(it); return k ? matName[k] : `color del set (rgb ${SET_DB[it.set].aura})`; };
    const matOfEn = it => { const k = matKey(it); return k ? matEn[k] : `the set color rgb(${SET_DB[it.set].aura}) as accent`; };
    const row = (d, extra) => { const it = makeDesignedItem(d.id); return Object.assign({ id: d.id, name: d.name, type: d.type, slot: ITEM_TYPES[d.type].label, tier: itemTierLabel(it), rarity: d.rarity,
      set: d.set ? SET_DB[d.set].name : '—', champ: d.champion ? CLASSES[d.champion].name : 'Universal', shape: itemIconShape(it), mat: matOf(it), matEn: matOfEn(it), lore: d.lore || '', epithet: d.epithet || '',
      effect: itemEffectLines(it).map(l => l.txt.replace(/^[✦★◆⚗] /, '')).join(' / ') }, extra || {}); };
    const ids = Object.keys(DESIGNED_ITEMS);
    const legend = [], mythic = [], unique = [], champ = [], sets = {};
    for (const k of ids) { const d = DESIGNED_ITEMS[k];
      if (d.set) { (sets[d.set] = sets[d.set] || []).push(row(d, { src: setArenas(d.set) || 'Botín de set' })); }
      else if (d.unique) unique.push(row(d, { src: 'Único diseñado a mano (jefes finales / pity de Único)' }));
      else if (d.mythic) mythic.push(row(d, { src: 'Receta: ' + (d.recipe || []).map(r => DESIGNED_ITEMS[r].name).join(' + ') }));
      else if (d.named) legend.push(row(d, { src: topArenas(d.arenas) || 'Cualquier arena' }));
      else champ.push(row(d, { src: 'Botín del campeón (cualquier arena)' }));
    }
    const setMeta = Object.keys(SET_DB).map(id => { const S = SET_DB[id]; return { id, name: S.name, theme: S.theme || '', aura: S.aura || '', pieces: setPieceCount(id),
      champ: (setPieceIds(id).map(p => DESIGNED_ITEMS[p].champion).find(Boolean)) ? CLASSES[setPieceIds(id).map(p => DESIGNED_ITEMS[p].champion).find(Boolean)].name : null,
      full: S.thresholds[S.thresholds.length - 1].desc, src: setArenas(id) }; });
    const nouns = []; for (const t of EQUIP_SLOT_TYPES) for (const n of ITEM_NOUNS[t]) { const it = makeItem(t, 'raro'); it.noun = n; it.name = n;
      nouns.push({ type: t, slot: ITEM_TYPES[t].label, noun: n, shape: itemIconShape(it), passive: (PASSIVE_DB.find(p => p.id === ITEM_ARCHETYPE_PASSIVE[t][n]) || {}).name }); }
    const fams = Object.keys(ITEM_FAMILIES).map(k => ({ k, label: ITEM_FAMILIES[k].label, color: ITEM_FAMILIES[k].color, hint: ITEM_FAMILIES[k].hint || '',
      arenas: Object.keys(ARENA_ITEM_FAMILIES).filter(a => ARENA_ITEM_FAMILIES[a][k]).map(arenaLabel).join(', ') }));
    const procs = Object.keys(LEGEND_PROCS).map(k => ({ k, name: LEGEND_PROCS[k].name, desc: LEGEND_PROCS[k].desc }));
    const myths = Object.keys(MYTHIC_POWERS).map(k => ({ k, name: MYTHIC_POWERS[k].name, desc: MYTHIC_POWERS[k].desc }));
    const uniqs = Object.keys(UNIQUE_POWERS).map(k => ({ k, name: UNIQUE_POWERS[k].name, desc: UNIQUE_POWERS[k].desc }));
    return { legend, mythic, unique, champ, sets, setMeta, nouns, fams, procs, myths, uniqs, total: ids.length };
  });
  await browser.close();

  const STYLE = 'pixel art, dark-fantasy chibi style of LA HORDA (same grammar as the Knight/Tanque master reference), 1px uniform dark outline, 2-3 flat shading tones per color, no gradients or airbrush, limited palette of 4-6 colors plus outline, crisp alpha (only 0 or 255), transparent background, centered, slight 3/4 angle, no text, no frame (the game draws the rarity frame)';
  const shapeEs = { sword: 'espada', dualblade: 'par de hojas', dagger: 'daga/colmillo', axe: 'hacha', hammer: 'martillo', scythe: 'guadaña', staff: 'bastón/báculo', scepter: 'cetro', bow: 'arco', gun: 'fusil',
    shovel: 'pala', orb: 'orbe', gem: 'cristal/gema', heart: 'corazón', chalice: 'cáliz', book: 'grimorio', chain: 'cadena', shield_kite: 'escudo de cometa', shield_round: 'rodela redonda',
    shield_tower: 'pavés/escudo torre', helm: 'yelmo', crown: 'corona', circlet: 'diadema/aureola', hood: 'capucha', hat: 'sombrero (kasa)', mask: 'máscara/visor', chest: 'coraza/peto',
    robe: 'túnica', cloak: 'manto', gloves: 'guantes', gauntlet: 'guanteletes', claws: 'garras', boots: 'botas', sandals: 'sandalias' };
  const shapeEn = { sword: 'sword', dualblade: 'pair of twin blades', dagger: 'dagger/fang blade', axe: 'axe', hammer: 'war hammer', scythe: 'scythe', staff: 'staff', scepter: 'scepter', bow: 'bow', gun: 'musket',
    shovel: 'shovel', orb: 'orb', gem: 'crystal', heart: 'heart relic', chalice: 'chalice', book: 'grimoire', chain: 'chain', shield_kite: 'kite shield', shield_round: 'round buckler',
    shield_tower: 'tower shield', helm: 'helmet', crown: 'crown', circlet: 'circlet', hood: 'hood', hat: 'straw kasa hat', mask: 'mask', chest: 'chest armor', robe: 'robe', cloak: 'cloak',
    gloves: 'gloves', gauntlet: 'gauntlets', claws: 'claw gloves', boots: 'boots', sandals: 'sandals' };
  const art = w => (/^(?!one)[aeiou]/i.test(w) ? 'an ' : 'a ') + w;
  const esc = s => String(s || '').replace(/\|/g, '/').replace(/\n/g, ' ');
  const card = (r, cat) => [
    `#### ${r.name}  \`${r.id}\``,
    `- **Categoría:** ${cat} · **Rareza:** ${r.tier} · **Slot real:** ${r.slot} (${r.type}) · **Set:** ${r.set} · **Uso:** ${r.champ}`,
    `- **Arena / fuente:** ${r.src}`,
    `- **Archivo:** \`assets/items/${r.id}.png\` · 64×64 PNG, fondo transparente (se registra en \`ITEM_ICON_ART["${r.id}"]\`)`,
    `- **Efecto (para que el arte lo cuente):** ${esc(r.effect) || 'solo estadísticas'}`,
    `- **Descripción visual:** ${shapeEs[r.shape] || r.shape} de ${r.mat}${r.epithet ? `, «${r.epithet}»` : ''}. ${esc(r.lore)}`,
    `- **Prompt:** \`${r.name} — game item icon, ${art(shapeEn[r.shape] || r.shape)}, palette: ${r.matEn}; lore hint: \"${esc(r.lore)}\"; ${STYLE}, 64x64\``,
    ''].join('\n');

  const L = [];
  L.push('# LA HORDA — Manifiesto de assets de objetos');
  L.push('');
  L.push('> Generado desde los datos reales del juego con `node tools/items/gen_item_manifest.js`. No editar a mano: si cambia el catálogo, se regenera.');
  L.push('');
  L.push('## Estado actual (sin reemplazos silenciosos)');
  L.push('');
  L.push(`- **Íconos:** ningún objeto tiene arte final todavía. Los ${D.total} objetos diseñados y los arquetipos procedurales usan un **ícono provisorio procedural en pixel art** (\`js/ui/item-icons.js\`): la silueta sale de la pieza, el material del elemento o del set y el marco de la categoría. **No es arte final.** Cuando exista el PNG se registra en \`ITEM_ICON_ART\` y la UI lo toma sola.`);
  L.push('- **Auras de set:** hoy son un anillo procedural (punteado y creciente con 2+ piezas; pleno con el set completo). El arte final es opcional y se lista abajo.');
  L.push('- **Skins de set:** hoy no hay ninguna. `SET_SKINS` está vacío y **nunca** se dibuja una skin sin su arte. Con el set completo solo se ve el aura plena.');
  L.push('- **VFX de procs:** hoy usan partículas y ondas del sistema VFX (paletas del juego). El reemplazo por sprites es una mejora, no un faltante que rompa algo.');
  L.push('');
  L.push('## Estilo obligatorio (docs/ART_BIBLE.md)');
  L.push('');
  L.push('Contorno oscuro de 1 px; 2–3 tonos planos por color, sin degradados; paleta de 4–6 colores más contorno; alfa nítido (0 o 255); fondo transparente. El marco de rareza lo dibuja el juego, así que **el PNG no lleva marco ni texto**. Tamaño 64×64 (se muestra a 40, 48 y 72 px con `image-rendering: pixelated`, así que conviene diseñar en 32×32 y escalar ×2).');
  L.push('');
  L.push('Colores de marco por categoría: Común blanco · Raro azul · Muy Raro amarillo · Legendario naranja · Mítico rojo · Set verde · Único violeta.');
  L.push('');
  const n = D.legend.length + D.mythic.length + D.unique.length + D.champ.length + Object.values(D.sets).reduce((a, b) => a + b.length, 0);
  L.push('## Resumen');
  L.push('');
  L.push('| Grupo | Cantidad | Formato |');
  L.push('|---|---|---|');
  L.push(`| Legendarios con nombre | ${D.legend.length} | ícono 64×64 |`);
  L.push(`| Míticos (receta) | ${D.mythic.length} | ícono 64×64 |`);
  L.push(`| Únicos (a mano) | ${D.unique.length} | ícono 64×64 |`);
  L.push(`| Objetos de campeón | ${D.champ.length} | ícono 64×64 |`);
  L.push(`| Piezas de set | ${n - D.legend.length - D.mythic.length - D.unique.length - D.champ.length} (${D.setMeta.length} sets) | ícono 64×64 |`);
  L.push(`| Arquetipos procedurales | ${D.nouns.length} siluetas base × ${D.fams.length} materiales de familia | ícono base 64×64, gris neutro, se tiñe por familia |`);
  L.push(`| Auras de set | ${D.setMeta.length} | tira de 8 frames de 128×64 (opcional) |`);
  L.push(`| Skins de set | ${D.setMeta.length} | atlas del campeón o capa superpuesta (ver abajo) |`);
  L.push(`| VFX de procs, míticos y únicos | ${D.procs.length + D.myths.length + D.uniqs.length} | tira de 6 frames de 64×64 |`);
  L.push(`| **Total de íconos de objeto** | **${n + D.nouns.length}** | |`);
  L.push('');
  L.push('## Prioridad de producción');
  L.push('');
  L.push('1. Únicos y Míticos: son pocos y son los que más se muestran.');
  L.push('2. Los 26 arquetipos procedurales: cubren el 90% del botín.');
  L.push('3. Legendarios con nombre.');
  L.push('4. Piezas de set, un set completo por vez para que se lea como conjunto.');
  L.push('5. Objetos de campeón.');
  L.push('6. Skins de set, luego auras y VFX.');
  L.push('');

  L.push('## 1. Únicos (diseñados a mano, nunca procedurales, sin skin)');
  L.push(''); D.unique.forEach(r => L.push(card(r, 'Único')));
  L.push('## 2. Míticos (modifican builds; sin skin)');
  L.push(''); D.mythic.forEach(r => L.push(card(r, 'Mítico')));
  L.push('## 3. Legendarios con nombre');
  L.push(''); D.legend.forEach(r => L.push(card(r, 'Legendario con nombre')));
  L.push('## 4. Objetos de campeón');
  L.push(''); D.champ.forEach(r => L.push(card(r, 'Objeto de campeón')));
  L.push('## 5. Piezas de set');
  L.push('');
  L.push('Las piezas de un set tienen que leerse como **un conjunto**: el mismo metal, el mismo motivo y el color del aura del set como acento.');
  L.push('');
  for (const S of D.setMeta) {
    L.push(`### ${S.name}  \`${S.id}\` — ${S.theme}${S.champ ? ` · solo ${S.champ}` : ''}`);
    L.push('');
    L.push(`Aura rgb(${S.aura}) · ${S.pieces} piezas · sale más en: ${S.src || '—'} · completo: ${esc(S.full)}`);
    L.push('');
    (D.sets[S.id] || []).forEach(r => L.push(card(r, 'Set')));
  }
  L.push('## 6. Arquetipos procedurales (Común → Mítico procedural)');
  L.push('');
  L.push('Una silueta base por arquetipo en **gris neutro**. El juego la tiñe con el material de la familia, así que no hacen falta 260 íconos. La pasiva de cada arquetipo es fija, y el ícono tiene que sugerirla (Colmillo = robo de vida, Égida = sobrecuración...).');
  L.push('');
  const BRIEF = { Hoja: ['sable curvo y liviano, filo fino', 'light curved saber with a thin edge'], Filo: ['hoja recta ancha con el filo brillante, cargada', 'broad straight blade with a glowing charged edge'],
    Colmillo: ['daga curva como un colmillo, gotas en la punta', 'curved fang-shaped dagger with drops at the tip'], Espada: ['espada larga de guardia ancha, empuñadura liviana', 'longsword with a wide crossguard and light grip'],
    Hacha: ['hacha de una mano con hoja pesada', 'one-handed axe with a heavy head'], Cetro: ['cetro corto con una gema en la cabeza', 'short scepter topped with a gem'],
    Escudo: ['escudo de cometa con remaches', 'riveted kite shield'], Rodela: ['rodela redonda y liviana', 'light round buckler'], 'Égida': ['escudo redondo con un emblema radiante', 'round aegis with a radiant emblem'],
    'Pavés': ['escudo torre alto', 'tall tower shield'], Yelmo: ['yelmo cerrado con visera', 'closed helm with visor'], Capucha: ['capucha de tela con sombra adentro', 'cloth hood with shadowed face'],
    Corona: ['corona de puntas con gemas', 'spiked crown with gems'], 'Máscara': ['máscara de guerra con ojos rasgados', 'war mask with narrow eye slits'], Coraza: ['coraza de placas', 'plate cuirass'],
    Pechera: ['peto acolchado con correas', 'padded breastplate with straps'], Manto: ['manto con capucha caída', 'cloak with lowered hood'], Cota: ['cota de malla', 'chainmail shirt'],
    Guanteletes: ['guanteletes de placas', 'plate gauntlets'], Guantes: ['guantes de cuero ajustados', 'fitted leather gloves'], Brazales: ['brazales con runas', 'rune-etched bracers'],
    'Puños': ['puños con nudilleras', 'knuckle-duster fists'], Botas: ['botas de cuero altas', 'tall leather boots'], Grebas: ['grebas de placas', 'plate greaves'],
    Sandalias: ['sandalias atadas', 'strapped sandals'], Pasos: ['botas livianas con alas o plumas', 'light boots with small wings or feathers'] };
  const fileKey = n => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  L.push('| Slot | Arquetipo | Silueta (brief) | Pasiva fija (Raro o más) | Archivo | Prompt |');
  L.push('|---|---|---|---|---|---|');
  D.nouns.forEach(x => { const b = BRIEF[x.noun] || [shapeEs[x.shape] || x.shape, shapeEn[x.shape] || x.shape];
    L.push(`| ${x.slot} | ${x.noun} | ${b[0]} | ${x.passive || '—'} | \`assets/items/base_${x.type}_${fileKey(x.noun)}.png\` 64×64 | \`${x.noun} — game item icon, ${art(b[1])}, neutral grey steel palette meant to be tinted, ${STYLE}, 64x64\` |`); });
  L.push('');
  L.push('**Familias (tinte y arena):**');
  L.push('');
  L.push('| Familia | Color | Arenas donde cae | Identidad |');
  L.push('|---|---|---|---|');
  D.fams.forEach(f => L.push(`| ${f.label} | \`${f.color}\` | ${f.arenas} | ${esc(f.hint)} |`));
  L.push('');
  L.push('## 7. Auras de set (opcional; hoy son procedurales)');
  L.push('');
  L.push('Formato: `assets/sets/aura_<id>.png`, tira de 8 frames de 128×64, un anillo elíptico bajo los pies en loop. El juego baja la opacidad en el set parcial y la sube con el set completo.');
  L.push('');
  L.push('| Set | Color | Motivo del anillo | Prompt |');
  L.push('|---|---|---|---|');
  D.setMeta.forEach(S => L.push(`| ${S.name} | rgb(${S.aura}) | ${S.theme} | \`ground aura ring loop for the "${S.name}" item set, ${S.theme}, main color rgb(${S.aura}), elliptical ring seen from 3/4 top-down, 8-frame horizontal strip 128x64 per frame, pixel art, 1px dark outline on runes, crisp alpha\` |`));
  L.push('');
  L.push('## 8. Skins de set (solo con set completo; hoy no existe ninguna)');
  L.push('');
  L.push('- **Set de campeón:** atlas completo de ese campeón con la armadura del set, con la misma grilla y animaciones que su atlas actual (`idle_*`, `walk_*`, `attack_*`). Va en `assets/sets/skin_<id>.png` y se registra en `SET_SKINS["<id>"]`.');
  L.push('- **Set universal:** capa de armadura superpuesta por dirección, de 96×96 por frame con la misma grilla del campeón, o un atlas por campeón si se quiere calidad plena. Hasta que exista, se ve solo el aura.');
  L.push('');
  L.push('| Set | Campeón | Tipo de skin | Prompt |');
  L.push('|---|---|---|---|');
  D.setMeta.forEach(S => L.push(`| ${S.name} | ${S.champ || 'cualquiera'} | ${S.champ ? 'atlas del campeón' : 'capa superpuesta'} | \`${S.champ ? S.champ + ' wearing' : 'armor overlay layer:'} the full "${S.name}" set (${S.theme}), accent color rgb(${S.aura}), same frame grid and poses as the champion atlas, ${STYLE}\` |`));
  L.push('');
  L.push('## 9. VFX de procs, míticos y únicos (hoy procedurales)');
  L.push('');
  L.push('Formato: `assets/vfx/items/<id>.png`, tira de 6 frames de 64×64. **Tiene que ser corto y chico:** el objetivo es que el proc se note sin llenar la pantalla.');
  L.push('');
  L.push('| Id | Nombre | Qué hace | Prompt |');
  L.push('|---|---|---|---|');
  [...D.procs.map(p => ['proc', p]), ...D.myths.map(p => ['mítico', p]), ...D.uniqs.map(p => ['único', p])].forEach(([k, p]) => L.push(`| \`${p.k}\` (${k}) | ${p.name} | ${esc(p.desc)} | \`small hit VFX for "${p.name}": ${esc(p.desc)}; 6-frame strip 64x64, pixel art, crisp alpha, short and readable, does not cover the enemy\` |`));
  L.push('');
  fs.writeFileSync(path.join(__dirname, '..', '..', 'LA_HORDA_ITEM_ASSET_MANIFEST.md'), L.join('\n'));
  console.log('OK', D.total, 'objetos diseñados +', D.nouns.length, 'arquetipos');
})();
