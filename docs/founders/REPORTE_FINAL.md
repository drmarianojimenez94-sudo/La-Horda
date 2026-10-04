# Reporte final — Expansión de campeones, Fundadores GM y Admin Panel

Rama: `claude/founders-gm-expansion`. Auditoría inicial: `docs/founders/AUDITORIA_FUNDADORES.md`.

## 1. Qué se auditó y qué se reutilizó
- **Reutilizado y extendido:** owner policy por ID estable, audit log y preview+confirm del servidor GM,
  CAS de guardados, regalos de cosméticos, eventos con fecha, contrato de la Champion Factory, normalizador y
  entry gate, `HERO_VOICES`, Códice, Tienda, runtime de la Expedición (objetos sincronizados, `exHit`,
  `exSafeStep`), sistema de audio sintetizado, `JUICE.reduceMotion`.
- **Mila = `myla`, Inara = `ynara`** (nombres en código). **Lyria no existía**; **Morwen ya existía** y se
  conservó: la Reina de las Máscaras se llama **Velmira** (decisión del usuario).

## 2. Qué se creó
| Área | Entregable |
|---|---|
| Taxonomía | `js/data/champion-taxonomy.js` (STANDARD/FAMILY/FOUNDER/EVENT/DEV/TESTER, releaseState, ventanas EVENT) compartida cliente/servidor |
| Seguridad | `server/entitlements.js`, `server/rbac.js`, `server/admin-users.js`, saneamiento de guardados, rankings no competitivos |
| Presencia GM | `server/presence.js` (identidad verificada por el relay), banners de lobby/arena agrupados y sin repetición, insignia FOUNDER/GM |
| Campeones | Nano GM, Facu GM (FOUNDER); Aurelia, Khepri, Velmira, Vhal, Bront, Oriel (STANDARD, INTERNAL) — kits, VFX, audio, lore, voces |
| Arte | 22 atlas generados (`tools/art/ascension_sprites.py`) — 8 campeones + 14 skins, PENDIENTES DE REVISIÓN |
| FAMILY | VFX de Berrinche y Santa Paciencia (`js/rendering/family-vfx.js`) |
| Admin | Usuarios, ficha, conceder/revocar, oro/nivel/arenas, buzón de ítems/Sets, reparar, roles, Registro (auditoría), Test Lab, **Volver a la campaña** |
| Roster Art Gate | `tools/art/roster_gate.js` + normalización única: 113 apariencias con la altura y línea de pies del Caballero; presentación uniforme (`js/data/champion-presentation.js`) |
| Factory | categorías en el contrato, análisis de duplicidad, manifiestos de los 8 |
| Accesibilidad | "Reducir efectos intensos" (`JUICE.reduceFx`) |

## 3. Cuentas Fundadoras
- **Nano GM → cuenta `NanoGM`**, vinculada por ID al iniciar el servidor (`server/operator-config.json`).
- **Facu GM → cuenta `FacuGM`** con rol estático **ADMIN** (panel de administración, sin `MANAGE_ROLES`
  ni OWNER), ambos resueltos por ID al arrancar. Si la cuenta no existe todavía, el nombre queda
  reservado y se crea con `FOUNDER_SIGNUP_CODE` (`docs/founders/OPERACION.md` §1).

## 4. Gates y QA (última corrida)
| Gate / suite | Resultado |
|---|---|
| Entry gate (37 clases, 19 candidatas, 57 simulaciones) | PASS |
| Roster Art Gate (113 apariencias, 3 vistas, presentación) | PASS |
| Server `npm test` (relay, cuentas, trades, GM, owner, **founders 106**, **presence 18**) | PASS |
| Kits Ascensión (`tools/ascension/functional.js`, 195) | PASS |
| Presencia en relay real, 3 navegadores (15) | PASS |
| Admin usuarios/Test Lab e2e (35) | PASS |
| Factory (26), duplicidad (sin DUPLICATE, REVIEW justificados) | PASS |
| Suite CI completa, re-corrida tras el arte y la normalización (44 suites, 0 fallos) | PASS |

**Fallos encontrados y corregidos en el camino:** colisión de nombre global en la Tienda
(`shopCategoryOf`), filas de campeones internos descartadas al recargar, techo de jefes de Aurelia apilado
con su pasiva, banners que la Opciones tapaba al salir del panel, doble apertura del panel (carrera),
sprite de respaldo del motor roto (siluetas negras) y diferencias de tamaño de hasta 20% entre campeones.

## 5. Riesgos y pendientes
- **Arte:** los atlas de los 8 son generados; pasan escala/apoyo pero su estilo es más simple que el arte
  encargado. Requieren revisión humana (probable REDRAW). Los STANDARD siguen INTERNAL.
- **Economía:** oro y compras STANDARD siguen siendo autoritativos del cliente (diseño previo).
- **Balance de Fundadores:** el gate de 150 s se satura; su ventaja no está cuantificada por esa métrica.
- **Skin Fundadora en multijugador:** el anfitrión replica la suya; la de un invitado Fundador se ve
  solo en su pantalla.
- **Test Lab** nunca persiste (no se implementó "conservar con confirmación").
- **iPhone real / audio humano:** sin prueba en dispositivo ni escucha humana.

## 6. Cómo validar manualmente
1. Servidor con `FOUNDERS_JSON` o `operator-config.json`; entrar como NanoGM → la Tienda muestra Nano GM
   "Concedido"; un jugador normal ve 9.999 ORO y "ESTE CAMPEÓN NO SE COMPRA. SE CONCEDE.".
2. Crear sala con NanoGM y unirse con otra cuenta Fundadora → un solo banner "LOS GAME MASTERS…".
3. Opciones → Entrar como Game Master → Usuarios / Registro / Test Lab → "⟵ Volver a la campaña".
4. `node tools/art/roster_gate.js` y abrir `docs/art-gate/roster-sheet.png`.
