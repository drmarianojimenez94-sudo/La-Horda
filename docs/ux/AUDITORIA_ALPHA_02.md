# La Horda — auditoría de interfaz, dos héroes y dificultad

1 de octubre de 2026. Base: `42a4a4d` (incluye los efectos/HUD del PR #40 y Ynara del PR #39). Evaluación editorial provisional: **87/100**. Es una valoración de la alfa y del alcance comprobado; no una certificación ni una encuesta de satisfacción.

## Resultado de la revisión

- La intro terminaba en una partida en perfiles nuevos; además ese camino era distinto con webdriver. Ahora todos llegan al menú. Elegir el regalo ocurre al pulsar Jugar y nunca inicia una arena automáticamente.
- El menú concentra Jugar y las tres acciones principales. Códice y desafíos siguen disponibles bajo Explorar. En la sala se ven primero las dos cartas; inventario, talentos, habilidades y aliados quedan plegados sin eliminar sus controles. Las cartas muestran nombre, rol, nivel, estilo, dominio, las cuatro habilidades, costo, recarga y parámetros base cuando existen. Las fichas de tienda también muestran habilidades antes de comprar.
- Campaña e Horda Infinita usan dos héroes diferentes. Cada humano elige inicial y reserva. La reserva entra automáticamente tras la primera muerte, con su propio nivel, talentos, equipo y kit; gana 2,5 segundos de inmunidad para la transición. Al agotarlas no puede moverse ni revivir. Solo queda como espectador mientras haya humanos conectados con cartas disponibles. Los bots también disponen de reserva. Arena Divina conserva su modalidad propia.
- Se conserva la identidad del slot de red; se limpian torretas, zonas, proyectiles y habilidades demoradas del héroe anterior, junto con cargas y estados de su kit. Los refuerzos específicos se reinician y los refuerzos genéricos de partida continúan. Las recompensas de invitados indican el héroe al que corresponden. Al reintentar o volver a la sala se restaura la pareja elegida.
- Las dos cartas se transmiten con sus fichas completas. Para conservar la arquitectura de equipamientos por clase, ningún héroe puede repetirse entre las cartas de los humanos de una sala; las opciones ocupadas se deshabilitan y el anfitrión valida la pareja antes de comenzar. Un perfil con un solo héroe puede reclamar una primera reserva gratis, una sola vez.
- Myla, Brasa, Eslabón, Morwen, Farolero, Iria y Ynara reciben cinco refuerzos propios cada uno: tres habilidades, definitiva y dúo. Son 35 cartas con tres rarezas y efectos del motor existente, con límites de radio, duración y potencia. No cambia el kit básico de movilidad de Eren.
- Se eliminaron dependencias residuales de revivir: los bots no persiguen cadáveres, las transiciones de Horda Infinita no restauran cartas agotadas, los desafíos cuentan entradas de reserva y el set Juramento otorga un escudo de transición en lugar de mejorar una resurrección imposible. Los soportes se puntúan por control, escudos y salvamentos, sin exigir revivir. Los IDs de desafíos ya cobrados se conservan.

## Ajuste de Normal

Normal aplica 0,90 a vida enemiga, 0,82 a daño, 0,86 a la referencia de daño de jefes y 1,18 al intervalo de aparición. Bosque y Hielo recibieron un ajuste adicional de 0,85 a vida, 0,80 a daño e intervalo ×1,12, porque los tres perfiles se detenían antes del jefe.

Bosque reduce la escalada de daño por oleada de 0,14 a 0,075 y la regeneración común de 1,2% a 0,6% por segundo; la potencia del héroe pasa de 0,90 a 1. Hielo reduce la escalada de 0,148 a 0,08, recupera parte de la velocidad y energía del héroe y quita la penalización de recarga; el peso del Ángel de Hielo en oleadas normales baja de 4 a 2. Conserva frío, braseros y mecánicas del jefe. Los parámetros de Pesadilla e Infierno permanecen iguales; estas excepciones de arena solo se aplican a Normal fuera de Divina.

## Simulaciones y pruebas

Se ejecutaron **69 partidas simuladas**: 30 de la versión base, 30 del primer ajuste, seis revisiones de Bosque/Hielo y tres revisiones finales de Hielo. La comparación final combina 24 casos de arenas sin cambios posteriores con las seis revisiones finales de Bosque/Hielo. Se conservan todos los resultados intermedios.

| Arena | Victorias base / 3 | Victorias finales / 3 |
|---|---:|---:|
| Ciudad | 2 | 1 |
| Fortaleza | 0 | 2 |
| Bosque | 0 | 3 |
| Reino Fúngico | 2 | 2 |
| Hielo | 0 | 3 |
| Acuática | 2 | 3 |
| Laberinto | 1 | 1 |
| Abismo | 2 | 3 |
| Minas | 3 | 1 |
| Infernal | 1 | 1 |
| **Total** | **13/30** | **20/30** |

Hay cuatro casos finales que siguen jugando al límite de 900 segundos; no se cuentan como victorias. Ciudad y Minas empeoran en esta muestra pequeña: merecen pruebas dirigidas de objetivos y del cambio de composición del equipo. No se ocultan esos resultados ni se los considera una mejora uniforme.

Los perfiles aprendiz, ocasional y habitual usan probabilidades de reacción 0,45/0,70/0,90 y demoras de 650/400/220 ms. Usan Mago o Eren con Tanque, Soporte y Asesino, al nivel esperado de cada arena, sin equipo ni reliquias, con puntos de habilidad distribuidos. Una semilla por escenario. El autopiloto usa el motor real, objetivos de arena, habilidades, jefes y elecciones de refuerzos; no mata jefes para forzar victorias.

**No son jugadores humanos ni simulaciones validadas de edades de 12 a 35 años.** Las edades no determinan experiencia. Esto sirve para detectar fallos y picos de dificultad; faltan sesiones con personas de ese rango. Tampoco valida una campaña continua con la economía y progresión reales: el nivel se prepara por arena y ambos héroes empiezan al mismo nivel.

Pruebas reproducibles incluidas:

- `tools/ux/functional.js`: 217 comprobaciones, sin fallos ni excepciones. Incluye los 19 relevos, inmovilidad, exclusión de revivir, reinicio de pareja, cancelación de efectos antiguos, 105 efectos de carta aislados, guías, set Juramento, contador de reserva e Horda Infinita. Capturas de Chromium a 844×390, 667×375 y 1280×800. En 390×844 se conserva el aviso de girar el dispositivo.
- `tools/ux/online.js`: cuatro contextos independientes con relay real; verifica fichas, conflictos, ausencia de reserva, relevo del anfitrión/invitado, movimiento, espectador, agotamiento y retorno al lobby.
- `server/test-admin.js`: 15 verificaciones de sesión, permisos, campos mínimos, versiones, niveles inválidos y conservación de inventario/oro.
- Gate de entrada: 19 registrados y tres simulaciones de Ynara, PASS. Su prueba específica: 37 comprobaciones, PASS. Pruebas del relay, cuentas e intercambios: PASS.
- Auditoría visual: 296 comprobaciones y 76 habilidades básicas, sin fallos ni errores. Esto comprueba integridad y regresiones, no una preferencia estética humana.

Los JSON y capturas están en esta carpeta. Las pruebas funcionales, de cuatro clientes y administración también se agregan al workflow de entrada.

## Administración

El panel está en Opciones → Administración y solo aparece para una sesión autorizada por el servidor. Permite consultar un usuario del juego y cambiar el nivel de un héroe desbloqueado entre 1 y 99. Reinicia XP del nivel, limita las asignaciones al presupuesto correspondiente y devuelve puntos disponibles. Al bajar nivel reinicia el árbol para eliminar talentos de escalones superiores; mantiene equipo, objetos, compras y oro.

La escritura exige la versión consultada: si otro dispositivo modifica el perfil, rechaza la operación y pide consultarlo de nuevo. El servidor registra quién hizo el cambio, a quién, el héroe y los niveles; no entrega contraseña ni guardado completo al panel.

Para activarlo en Render, desplegar el servidor actualizado y configurar `ADMIN_USERS` con el **nombre exacto de usuario de tu cuenta del juego**. Puede ser una lista separada por comas. No es el apodo de la sala ni el usuario de GitHub. No se asignó un administrador por suposición. Tras cambiar un nivel, el jugador debe salir de la partida y cargar la versión de la nube al sincronizar; no modifica una arena que ya está en curso.

## Puntuación y distancia a 100

| Criterio | Puntos |
|---|---:|
| Acceso al juego y claridad de interfaz | 18/20 |
| Lectura visual de combate y controles | 18/20 |
| Identidad de héroes y reglas de supervivencia | 22/25 |
| Dificultad y progresión | 15/20 |
| Integridad, cooperativo y administración | 14/15 |
| **Total provisional** | **87/100** |

No llega a 100 porque faltan pruebas de comprensión con jugadores reales, Safari/iPhone físico y rendimiento en dispositivos modestos; la campaña con compras, progresión de ambos héroes y latencia real no está validada de punta a punta. Ciudad y Minas muestran regresiones de resultado y cuatro escenarios alcanzan el límite de tiempo. Los refuerzos nuevos tienen cobertura funcional, pero necesitan varias semillas, combinaciones de equipo y sesiones humanas para medir si todas las elecciones compiten en utilidad. El puntaje no significa que haya 13 errores encontrados: expresa límites de diseño y evidencia disponibles.

## Reproducir

Instalar Playwright y Chromium y ejecutar desde la raíz: `node tools/ux/functional.js`, `node tools/ux/online.js`, `node tools/ux/playtest.js after`. Las pruebas de navegador aceptan `CHROMIUM_PATH`. Para el panel: `cd server`, `npm ci`, `node test-admin.js`; usa cuentas y archivos temporales aislados. Para comparar la base, servir un checkout del commit base con `BASELINE_DIR` y ejecutar `node tools/ux/playtest.js before`. `ARENAS=bosque,hielo` limita las revisiones. No ejecutar pruebas de cuentas contra la base de datos de producción.
