# Auditoría — Expansión de campeones, Fundadores GM y Admin Panel

Fecha: 2026-10-03 · Base: `main` @ `e6c0063`. Solo lectura; este documento no cambia código.

## 1. Roster actual (29 campeones)

| Origen | Ids | Archivo |
|---|---|---|
| Base (12) | tanque, guerrero, mago, soporte, segador, axiom, profeta, musashi, cazadora, nigromante, libertador, eren | `js/data/champions.js` (`CHAMPION_CATALOG`, `CLASSES`) |
| Portadores (7) | ynara, myla, brasa, eslabon, morwen, farolero, iria | `js/data/portadores.js` → push a `CHAMPION_CATALOG`/`CLASSES` |
| Expedición (10) | vesper, nahir, orsa, baltra, maura, renko, dariel, tibor, zahra, sira | `js/champions/expedition/catalog.js` + `register.js` (cargado en producción, `index.html:720`) |

Nombres reales en código: **Mila = `myla`** ("La Maga del Yogur", rol mago, ult `my_tantrum` BERRINCHE) e **Inara = `ynara`** ("El Ángel del Silencio", soporte, ult `yn_patience` Santa Paciencia). Sus kits están en `js/champions/portadores.js` y `js/champions/ynara.js`; el render especial en `js/rendering/portadores.js`.

**Conflictos con el pedido:**
- **Lyria no existe** en ningún archivo, doc ni art-source.
- **Morwen ya existe** como portador ("La Destiladora de Ecos", alquimista de resina, set `vidrio_negro`, atlas y skin "Destilación Carmesí"). El pedido describe otra Morwen ("La Reina de las Máscaras", soporte/control).

## 2. Taxonomía / categorías

No existe ningún concepto de categoría, familia, fundador, exclusividad, `releaseState` ni tipo de adquisición. El único eje es `roleCategory` (tanque/asesino/mago/soporte). `rarity` existe solo en cosméticos e ítems. **Se crea desde cero, data-driven**.

## 3. Arte, Art Bible y Art Gate

- Sprites de campeón = **atlas PNG encargados** (`assets/sprites/champions/<id>/atlas.png`, `champPackLoadAtlas` en `js/assets/*-meta.js`). Los grids de `js/data/pixel-art.js` son solo fallback.
- El importador (`tools/expedition/build-art.py`) declara explícitamente: *"No drawing, recoloring or invented poses"*. El pipeline del proyecto **no genera arte de personaje**; importa hojas encargadas y el Visual Gate (Art Bible §8) exige revisión con reviewer y evidencia.
- Los VFX sí se dibujan en código (capas propias, Art Bible §7): `js/rendering/*`, `skin-fx.js`, `champion-signatures.js`.
- **Consecuencia:** el agente puede implementar kit, VFX, metadata, Factory manifest, comportamiento y pruebas, y redactar briefs de encargo; **no puede producir atlas de personaje que pasen el Art Gate**. Hasta que exista arte aprobado, un campeón nuevo queda en `releaseState: INTERNAL` (jugable en Test Lab, invisible al público), usando el fallback de grid. Esto es exactamente lo que el campo `releaseState` debe gobernar.

## 4. Champion Factory y gates

- `tools/factory/cli.js new|validate|gate`; `validate` → `INCOMPLETE` o `STRUCTURAL_PASS` (nunca aprobación).
- Contrato (`contracts.js`): básico + 3 habilidades + ult con anticipación/ejecución/impacto/feedback, mecanismo de horda, atlas + sha256 + review PASS, skin/croma/Set, presupuestos (≤64 partículas, ≤8 invocaciones, ≤4 voces), evidencias por gate.
- `audit-roster.js` **no tiene análisis de duplicidad** (el pedido lo asume): hay que agregarlo.
- No soporta `category`; hay que extender el contrato (FOUNDER exento del techo de balance competitivo, FAMILY normal).
- Balance de entrada: `champion-entry-balance.js` normaliza todo id fuera de `knownChampions`; `tools/balance/entry-gate.js` simula 3×150 s y exige daño medio ≤1.35× la media del rol. **Un Founder "deliberadamente ilegal" no pasa este gate por diseño** → necesita una excepción explícita, data-driven y documentada (categoría FOUNDER con su propio techo, nunca saltando el gate en silencio).
- Ynara y la Expedición no están en `knownChampions` (se normalizan); Myla sí.

## 5. Backend, cuentas y seguridad

- Node `http` + `ws` en un puerto (`server/relay.js`); Postgres si hay `DATABASE_URL`, si no JSON en disco (`server/accounts.js`).
- Cuenta: id numérico, userKey, user, name (display), email, passHash (scrypt), fechas. **Todo el progreso vive en un blob JSON de cloud save** (`horda_saves.data`, CAS por `version`).
- **Un solo rol: OWNER.** `operator-config.json` → `{"ownerAccount":"NanoGM"}`; al iniciar se resuelve a id numérico y `isOwner` compara ids. El nombre está reservado en el registro. Display names no protegidos (cualquiera puede llamarse "NanoGM" en perfil/lobby).
- **No existe cuenta "Facu GM"** ni referencia en config (solo "Facundo" como fixture de tests). → Infraestructura + configuración explícita pendiente; no se adivina.
- Admin existente (owner-only, `/api/gm/*`, `/api/admin/*`): dashboard, multiplicadores y precios, eventos con fecha, noticias, chat pin, búsqueda de jugadores (solo nombre/fechas), regalo de cosméticos, nivel de campeón, reset granular con preview + frase de confirmación + snapshot, **audit log** server-side (2000 entradas; `ADMIN_LEVEL` solo va a consola).
- **Hallazgo crítico: oro y compras son 100 % cliente.** `shopBuyChampion` modifica el save local y `PUT /api/save` acepta cualquier JSON. Un cliente manipulado puede marcar cualquier campeón como `unlocked`. Para Founders esto es inaceptable: hace falta **saneamiento server-side del save** (los campeones FOUNDER solo quedan desbloqueados para la cuenta con entitlement; el resto se fuerza a `false` al guardar y al servir).
- Hacer autoritativo el oro en general excede este alcance (la simulación es host-side); se documenta como riesgo.

## 6. Multiplayer

- Relay puro; el host simula. Nombre de slot = texto libre del cliente, sin token ni id de cuenta en WS. Reconexión por `clientId` anónimo en sessionStorage (slot preservado 3 min).
- **Consecuencia para banners GM:** hoy cualquiera podría fingir ser GM en el lobby. La presencia Founder requiere que el relay verifique la sesión de cuenta al `create/join` y adjunte un flag público `founder` calculado por el servidor. El anti-spam puede apoyarse en el slot preservado (reconexión ≠ nueva incorporación).

## 7. Tienda, colección, Códice, persistencia, voces

- Precios: `CHAMPION_PRICE_GOLD=2500`, overrides del servidor vía `shopConfiguredPrice`. `champion-select.js:24,29` usa el precio fijo (inconsistencia menor).
- Tabs de tienda: destacados / campeones / objetos / skins. Sin filtros por categoría.
- Propiedad: `save.champions[id].unlocked`. Migraciones = flags booleanos one-shot en `_loadSaveInner` (`js/storage/save.js`), backup previo en resets destructivos.
- Códice lista todo `CHAMPION_CATALOG` y muestra bloqueados con "Desbloquear".
- Frases: `HERO_VOICES[k]={pick,win,fall}` (`js/data/story-text.js:153`).
- El starter permite elegir cualquier campeón del catálogo → los Founders deben excluirse.

## 8. Accesibilidad / performance

- Único ajuste: **Reducir movimiento** (`JUICE.reduceMotion`, `localStorage horda_motion`, respeta `prefers-reduced-motion`). No hay ajustes de partículas, flashes ni intensidad de shake.
- Presupuesto VFX por campeón ≤64 partículas (PRODUCTION_BIBLES).

## 9. Lore canónico relevante

Cuatro Guardianes y cuatro cristales selaron la Horda; El Forjador partió el Sello y está encadenado en el Infernal (solo voz); el Primero/Hechicero Supremo; Cicatrices de la Horda unen las arenas; final: los campeones se vuelven los nuevos Guardianes (`docs/lore/LA_HORDA_LORE_BIBLE.md`). Los Regentes deben encajar por encima de Guardianes sin contradecir este canon.

## 10. Reutilizar vs. crear

| Reutilizar / extender | Crear |
|---|---|
| Owner policy por id estable, audit log, preview+confirm, CAS de saves, gift de cosméticos, eventos con fecha (`/api/gm/events`), Factory contract, entry gate, `HERO_VOICES`, Códice, tabs de tienda, `JUICE.reduceMotion` | Metadata de categoría + `releaseState`, entitlements Founder server-side, saneamiento de save, RBAC con permisos, grants de campeón con origen, ficha de usuario completa, Test Lab, identidad Founder verificada en relay, banners, análisis de duplicidad en Factory |
