# La Horda — estándares de producción Alpha

Este documento completa los estándares existentes; no crea una segunda Art Bible ni un segundo canon. Autoridades: `docs/ART_BIBLE.md` (estilo y gate), `docs/lore/LA_HORDA_LORE_BIBLE.md` (canon), `BALANCE_CAMPEONES.md` y `docs/balance/champion-entry-reference.json` (balance), `docs/vfx/AUDITORIA_COMBATE_HUD.md` (implementación VFX/HUD), `docs/arena-identity/README.md` (arenas). Las reglas siguientes son criterios de producción; su publicación no demuestra que todo el catálogo ya las cumpla.

## Auditoría y preservación

Antes de tocar un sistema: registrar 10/10 → preservar, bueno → mejorar, inconsistente → corregir, deficiente → refactorizar, roto → reparar. Mantener evidencia por cambio. Se preservan la referencia visual Tanque, separación de datos/módulos, normalizador de entrada por rol, gate de balance, audio offline y suites de red existentes. No se otorga retrospectivamente 10/10 a sistemas no medidos. El canon y las referencias no cambian para esconder un fallo.

## Champion Bible

Aplican las proporciones, contornos, cuatro direcciones y escalas de Art Bible §§2–6. Silueta legible sin VFX; postura, arma y paleta identifican personalidad. Documentar frames reales para idle, walk, attack, cast, hit, death y ultimate; un estado puede reutilizar frames coherentes, pero nunca inventar un atlas inexistente. Las transformaciones son explícitas y preservan identidad. El ancla de pies y escala no cambian al seleccionar apariencia.

Paquete: identidad, fantasía, rol, lore, estadísticas, básico, tres habilidades, definitiva, herramienta contra hordas, telegraphs, VFX/SFX, atlas, talentos, maestría, Códice, skin, croma, Set y skin de Set. Validar básico/kit a nivel inicial, talentos, bosses, límites de invocación, limpieza al morir/salir y réplica en cooperativo. Una curación en área no demuestra por sí misma capacidad de resolver hordas: probar daño compartido, infección, torreta, cadenas o equivalente útil.

## Enemy Bible

La jerarquía común → élite → jefe usa escala y detalle según Art Bible §9. Priorizar silueta/ritmo sobre saturación. Cada ataque peligroso tiene anticipación visible, límite espacial verdadero, momento de impacto y recuperación. El aviso sigue visible con VFX reducidos; no depender solamente del color. Daño y control tienen feedback legible. Jefes no cambian resistencias ni radio real para adaptarse a un dibujo. Probar montones de enemigos, borde de pantalla y cuatro jugadores.

## Ability Bible

Contrato obligatorio: **ANTICIPACIÓN → EJECUCIÓN → IMPACTO → FEEDBACK**. Indicar dueño, zona, dirección, instante, afectados, duración y terminación. El básico puede tener anticipación muy corta; un peligro letal requiere oportunidad real de respuesta. Visual y audio siguen básico < habilidad < habilidad poderosa < definitiva. Ninguna animación cosmética altera cooldown, radio, daño o hitbox. La definitiva combina firma, ritmo e impacto; no equivale a multiplicar partículas genéricas. Prueba sin talento, con talento máximo, con audio apagado y con partículas reducidas.

## VFX Bible

| Familia | Regla |
|---|---|
| Proyectil/trail | Núcleo reconocible, dirección inequívoca, trail breve sin ocultar enemigos |
| Impacto/explosión | Efecto centrado en contacto real y duración corta; no señala daño fuera del radio |
| AoE/estado | Perímetro fiel; dueño y estado diferenciables; expiración clara |
| Cura/escudo | Diferentes de peligro enemigo; feedback visible al receptor |
| Summon | Identidad del dueño, límite y limpieza definidos |
| Ultimate | Firma única, anticipación e impacto propios; evita flash completo repetido |

Presupuesto inicial por campeón nuevo: hasta 64 partículas propias simultáneas, ocho invocaciones (preferir 1–3), sin asignaciones sin límite por tick. Estos son techos de admisión, no mediciones del rendimiento actual. Efectos de peligro, proyectiles y zonas mantienen lectura al reducir decoraciones. Objetivo 60 FPS y piso sostenido 30 FPS en dispositivos de referencia; medir p95 de frame, cantidad de entidades y memoria en carga representativa. Emulación móvil en desktop no aprueba un iPhone real. No modificar presupuestos globales existentes sin perfilado.

## Audio Bible

Conservar motor, música por arena y mezcla auditados. Familias distinguibles: básico, impacto, habilidad, ultimate, daño, cura, escudo, loot, UI, boss y evento. La definitiva usa acento y envolvente propios, no solo volumen. Máximo inicial cuatro voces cosméticas simultáneas por campeón; agrupar sonidos repetidos de horda, limitar por familia/intervalo y dar prioridad a advertencias. Respetar mute/volumen, desbloqueo de audio por gesto y suspensión de pestaña. Medir clipping (pico objetivo < −1 dBFS), NaN, voces/nodos vivos y costo de secuenciador con `tools/audio/t_audio_mix.js`. Escucha humana sigue siendo necesaria para juzgar fatiga e identidad; audio offline no equivale a prueba auditiva.

## UI Bible

Usar tokens y componentes existentes. Panel oscuro, marco consistente, contraste de texto y tipografía del juego; ningún link azul del navegador o input nativo sin tematizar. Botones, cards, selectores, formularios, scroll, chat y modales comparten focus visible, pressed y disabled. Mantener jerarquía título → subtítulo → cuerpo → ayuda; no reducir texto hasta ilegible para ocultar overflow. Controles táctiles idealmente ≥44 px, sin perder contenido en 667×375. Modales tienen salida predecible, foco manejado y restaurado. Mensajes de error accionables; no `alert()` genérico.

Códice: nombre/título/rol, preview animada, historia una sola vez, habilidades, apariencias, equipo, talentos, maestría y Sets. Apariencias: ORIGINAL | SKINS | CROMAS | SET; selección cambia preview y texto de esa apariencia. Mostrar origen y DISPONIBLE PARA PRUEBAS en Alpha. No esconder duplicados mediante CSS. Landscape obligatorio durante gameplay; portrait presenta invitación temática a girar. Probar 844×390, 667×375 y desktop con textos largos y navegación rápida.

## HUD Bible

Vida y recurso primero; XP legible; habilidades muestran icono, cooldown y disponibilidad; ultimate indica carga/listo. Objetivo y oleada ocupan espacio acotado. Barra de boss no tapa controles; estados muestran duración/expiración, pickups breve confirmación. Mensajes no bloquean puntería ni joystick. Respetar safe areas de iPhone y tamaños reales, no offsets fijos asumidos. Evitar texto duplicado entre objetivo, aviso y tutorial.

## Cosmetic Bible

**Croma ≠ skin.** Croma cambia paleta. Skin cambia ropa, armadura, accesorios o silueta secundaria; aura sola tampoco la convierte en skin. Épica incorpora elaboración visual adicional; legendaria puede cambiar animación, VFX y SFX con los mismos límites y mecánicas. Raridad no sustituye evidencia del cambio.

Cada registro requiere nombre, campeón, tipo, rareza, tagline, lore propio, visualTheme, unlockSource, collection, vfxProfile; sfxProfile puede reutilizar el original explícitamente. Preview y thumbnail completos, alineados y animados cuando corresponda; revisar con fondos claros/oscuros. La skin no modifica estadísticas ni equipamiento, talentos o daño. Modelo futuro: premiumPrice nullable, currency nullable, availability, collection, featured, creator, limited; owned se calcula del progreso, no del catálogo. Alpha: sin checkout, precios monetarios ni bloqueo por pago.

## Set Bible

Piezas reconocibles por icono/verde, nombre y contador x/n, nunca solamente por color. Mostrar cada pieza faltante, arena/fuente de drop y cómo repetirla. Preservar bonos jugables existentes hasta validar un rebalance separado; la recompensa cosmética de completar no añade poder. Colección persistente y equipo actual son conceptos distintos: desequipar no revoca skin ganada. Reward referencia campeón y skin válidos y no duplica grants al recargar. Una skin de Set tiene lore y reinterpretación real; recolor de Set se etiqueta croma hasta producir arte aprobado.

## Fábrica y definición de terminado

`tools/factory/cli.js` genera un contrato vacío, verifica consistencia y orquesta gates existentes; no dibuja arte, inventa lore aprobado ni registra código incompleto. Ver `tools/factory/README.md`. Estructura válida ≠ aprobación artística ≠ balance validado. Evidencia corresponde al cambio actual; regenerar cuando cambien assets/kit. Todo fallo conserva causa, impacto, intento y siguiente acción en el informe ejecutivo, no en decenas de documentos duplicados.
