# Elyra, la Guardiana del Alba

Rediseño autorizado de la sanadora principal, conservando `soporte` como identificador de guardado, equipo, talentos y red. Conserva pelo castaño, vestimenta verde/marfil y báculo luminoso.

**Alba Purificadora** mantiene la cura del 24%, radio 260, coste 40 y recarga de 7 segundos; añade un impacto de daño ×1,2 en radio 160. Daño y radios escalan mediante maestrías y talentos existentes. No crea entidades ni desplaza jefes. Los bots pueden usarla ofensivamente con el equipo sano. Las demás habilidades mantienen sus valores.

Los cuatro campeones originales reciben nombres propios y descripciones: Aldric, el Último Bastión (tanque); Kael, la Daga Carmesí (asesino); Thalen, el Tejedor Elemental (mago); Elyra, la Guardiana del Alba (sanadora). Nombres completos en selección y Códice; nombres cortos en HUD.

## Arte y pantalla de inicio

Visual gate PASS tras inspección de `visual-gate.png`: comparación contra Tanque a igual escala/fondo/iluminación. Atlas 448×672, celdas 112×112, 24 cuadros; cuatro pasos y cuatro lanzamientos para frente, perfil y espalda. Izquierda por espejo. Golpe reutiliza idle; caída conserva el efecto genérico. Alpha binaria, contorno oscuro y pies alineados. Escaneo técnico: cero archivos señalados.

`drawSoporteAtlas` usa el nuevo pack tanto en juego como en selección y título. Se corrige la distribución del ejército del título: el salto de tres sobre doce claves dejaba fuera campeones en cada fila. El recorrido continuo permite que Elyra aparezca también en primer plano. Captura móvil: `title-mobile.png`.

Arte generado mediante la habilidad de imágenes por pedido explícito, usando la sanadora previa y el Caballero como referencias. Fuente original conservada en `art-source/elyra/source.png`; atlas y metadatos en `assets/sprites/champions/soporte/v2/`. Prompt: sanadora femenina chibi con pelo castaño, hábito verde/marfil, capa corta, botas y báculo con gema; contorno oscuro, pixel art 16-bit y sombreado limitado; hoja 4×6 transparente con cuatro pasos frente/perfil/espalda y cuatro lanzamientos frente/perfil/espalda, conservando rostro, ropa y equipo.

## Verificación sobre main actualizado

31 comprobaciones PASS, tres simulaciones de 150 segundos a nivel 20 sin equipo, semillas 117/431/991. Media de daño 4339,99, inferior al techo orientativo de soporte 8803,53. Tres supervivencias y cero errores de página; no implica equilibrio universal. Ver `functional-results.json`. `node tools/portadores/test-elyra.js` reproduce pruebas y captura, con Playwright y Python; admite `CHROMIUM_PATH`. Gate de referencia y gate de entrada: PASS; referencia y roster conocido sin modificaciones.
