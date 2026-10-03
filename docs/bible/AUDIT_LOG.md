# Audit Log

Formato: **Problema → Decisión → Implementación → Validación → Commit**. Solo decisiones importantes.

## 2026-10-03 · World, Champion & Arena Overhaul V2 (rama `claude/world-overhaul-v2`)

### A1. Presentación de campeones inconsistente
- **Problema**: 29 campeones con 4 formatos de nombre ("Aldric, el Último Bastión", "Axiom", "La Profeta",
  "El Eslabón"); historias de 191 a 569 caracteres; orígenes de la expedición con claves internas
  (`ciudad`, `laberinto`); 12 campeones originales sin metadata de pasiva aunque varios la tienen en código.
- **Decisión**: estándar "Nombre, título" (Champion Bible §1); historia 260–480 caracteres; frase de catálogo
  única; pasivas documentadas solo si existen en código (Aldric, Kael, Thalen, Elyra y Axiom quedan WARNING:
  no tienen pasiva propia). Renombres: Ismara (Profeta), Sylva (Cazadora, ya canónico en el código), Ilvar
  (Nigromante), San Martín (Libertador), Garren (Eslabón), Tobías (Farolero), Segador "el Olvidado".
- **Implementación**: `js/data/champion-identity.js` (`CHAMPION_IDENTITY`, `CHAMPION_STANDARD`) se aplica
  una vez al cargar, después de registrar a todos y antes del normalizador de balance. Las claves internas
  no cambian (guardados intactos). No toca estadísticas.
- **Validación**: `tools/bible/champion-validator.js` (identidad, lore, origen).

### A2. Sin fuente única de metadata de habilidades
- **Problema**: descripción, ícono, apuntado y estados repartidos entre `CLASSES`, `AIM_PROFILES`,
  `SKILL_ICON_IMG`, guías y Códice; nada describía targeting/estados para la UI.
- **Decisión**: derivar (no duplicar) una `AbilityDefinition` de los datos existentes.
- **Implementación**: `js/skills/ability-registry.js` (`championAbilityDefinitions`, `abilityLiveValues`,
  `validateAbilityDefinition`, overrides en `ABILITY_META`).

### A3. Validador de habilidades
- **Problema**: el audit de roster previo solo leía registros; ninguna herramienta verificaba que una
  habilidad tenga efecto, VFX, SFX y replicación.
- **Implementación**: validador en runtime con medición diferencial y canario (ver QA.md).
- **Hallazgos reales**: (1) la definitiva de Musashi sin Marca de Duelo **consumía la carga sin hacer
  nada** → ahora elige sola al rival más digno a 320 u, y si no hay nadie devuelve la carga y el
  enfriamiento. (2) El chequeo de sprite por `CHAMP_PACK` daba falsos FAIL (Aldric/Kael/Thalen dibujan
  por otro camino) → se reemplazó por dibujo real en un canvas aparte.
