# LA HORDA — Cómo seguir hasta la alfa

## Por qué a veces parece lista y a veces no

El juego es **ancho** pero no está **cerrado**:

- 12 campeones, 7 arenas jugables, campaña, coop de 4, loot, sets, skins, talentos y jefes con fases.
- Cada sistema pasa sus pruebas automáticas (15 suites + la funcional) y no tira errores.
- Lo que falta no es código que ande mal. Son cuatro cosas que ningún test de navegador resuelve:
  1. **Nadie de afuera lo jugó todavía.** Nuevo jugador, celular real, red real, 4 humanos: todo figura como *HUMAN TEST REQUIRED* en `LA_HORDA_ALPHA_READINESS.md`.
  2. **La curva es despareja.**
     - Las arenas 1-4 son cómodas y la Gélida es una pared (simulado: 1/7 y 1/22 intentos; Tanque 0/20).
     - El escalado del BUGFIX 01 ayuda al rejugar, pero la pared sigue.
  3. **Conviven el arte pintado y el de código.**
     - Jefes con un solo cuadro (Mago de Hielo, Ángel Caído, Jinete).
     - Props dibujados por código, íconos provisorios, 3 skins de campeón sin hoja.
     - Cada vez que aparece uno, el juego "se ve alfa".
  4. **Seguimos sumando alcance.** Cada tanda agrega algo nuevo (arena, jefe, skins) antes de cerrar lo anterior. Eso mantiene la sensación de "casi".

**Recomendación central: congelar el alcance y entrar en modo "cerrar".** Nada nuevo hasta la alfa, salvo lo que esté en esta lista.

## Plan (en orden; cada fase tiene su salida)

### Fase 0 — Congelar y definir la alfa (1-2 días)
- **Alfa 1** = 12 campeones, las 7 arenas jugables, campaña completa, coop de 4, tienda, loot, sets y skins actuales.
- Quedan **afuera**: Ciudad Maldita, Abismo, Minas, Arena Divina completa, sets universales con skin y campeones nuevos.
- **Salida:** esta lista aprobada. Todo lo que no esté acá va a `docs/post-alfa.md`.

### Fase 1 — Red de seguridad automática (2-3 días)
- El repo **no tiene CI**. Propuesta: una GitHub Action que en cada PR corra las 15 suites de `tools/items/`, la funcional (`tools/regression/t_func.js`) y un humo de 60 s por arena.
- Así cada merge queda protegido sin depender de que yo lo corra a mano.
- Arreglar el flake conocido `BOTS.vuelven_a_la_zona_segura` (Micelial), o marcarlo como no bloqueante con su causa escrita.
- **Salida:** CI verde en `main`.

### Fase 2 — Primera prueba humana (1 semana)
- 5 a 10 personas, **en celular** (al menos 2 iPhone con Safari y 2 Android de gama media), sesión de 30-40 min con la checklist manual.
- Agregar **telemetría local, sin servidor**:
  - por partida: arena, nivel alcanzado, muertes, tiempo por nivel, abandono y campeón;
  - botón "copiar informe" que ustedes me pasan.
- Preguntas clave:
  - ¿entienden qué hacer en cada arena sin leer?
  - ¿qué los mató?
  - ¿cuándo quisieron dejar?
  - ¿el celular calienta o baja de cuadros?
- **Salida:** informe con los 10 problemas más repetidos. Esos definen la Fase 3, no mi intuición.

### Fase 3 — Curva y economía (1 semana)
- Suavizar la Gélida: menos frío pasivo, braseros más cerca o una ayuda si perdiste 2 veces. Recalibrar las arenas 5-7 con los datos de la Fase 2.
- Revisar oro/XP por partida contra los precios: 1000 los campeones y los objetos de tienda, 5000 los finales.
- Propuesta de sets (ver `LA_HORDA_SETS_AUDIT.md`): diferenciar los bonus de 2 piezas de Profecía, Manada y Granadero.
- **Salida:** campaña simulada de 3 campeones sin paredes (ninguna arena por debajo de 35% de victorias al primer intento en simulación) y el feedback humano de "demasiado difícil" en menos de 1/3.

### Fase 4 — Arte que "rompe" la ilusión (en paralelo desde la Fase 2)
Pedidos de **hoja completa**, en este orden (fichas en `LA_HORDA_ASSETS_FALTANTES.md` y `docs/assets_faltantes/`):
1. Jefes de un cuadro: Mago de Hielo, Ángel Caído y Jinete. Son los que más se ven.
2. Las 3 skins de campeón que faltan: Baluarte (Tanque), Granadero (Libertador) y Réquiem (Nigromante). Con eso el sistema de skins queda completo.
3. Props de mecánicas que hoy son de código: fisura, runa, corriente, sellos, íconos de acción.
4. Íconos finales de objetos (169). Pueden quedar provisorios en la alfa si se ven prolijos.
- **Salida:** ningún jefe con un solo cuadro y ninguna skin de campeón faltante.

### Fase 5 — Claridad en combate (3-4 días)
- Íconos de estado sobre los enemigos: quemado, congelado, sangrando, marcado.
- Tutorial de apuntado de habilidades y de XP/nivel. Son los 2 conceptos que faltan de 18.
- Tooltip de sets: marcar qué umbral está activo y qué hace. Ya existe; revisarlo con humanos.
- **Salida:** en la prueba humana, "no entendí qué me pegó / qué hace esto" en menos de 1/5.

### Fase 6 — Coop real (3-4 días)
- 4 humanos, redes reales (Wi-Fi + 4G), 3 arenas distintas y una desconexión a propósito.
- **Salida:** 3 sesiones seguidas sin desincronización visible ni partida trabada.

### Fase 7 — Alfa cerrada
- Número de versión visible y changelog corto dentro del juego.
- Formulario de feedback: un link en el menú.
- Política de guardado: la alfa no se resetea más. Las migraciones ya existen; se congela el formato.
- **Salida:** link para compartir y el primer grupo de testers adentro.

## Criterios de "está lista para la alfa" (todos)
- [ ] CI verde en `main` y 0 errores de página en el humo de las 7 arenas.
- [ ] Prueba humana: 8 de 10 terminan la arena 1 sin ayuda y 6 de 10 quieren jugar otra.
- [ ] Ninguna arena por debajo de 35% de victorias al primer intento (simulación) y sin "pared" en el feedback.
- [ ] Celular de gama media: 50+ FPS estables con 40-50 enemigos, sin calentarse en 20 min.
- [ ] Coop de 4 humanos: 3 sesiones sin desincronización.
- [ ] Ningún jefe con un solo cuadro y las 12 skins de campeón completas.

## Lo que NO haría antes de la alfa
- Arenas nuevas (Ciudad Maldita, Abismo, Minas) y campeones nuevos.
- Skins para los sets universales (132 hojas).
- Sistemas nuevos de progresión. Los que hay alcanzan; falta calibrarlos.
