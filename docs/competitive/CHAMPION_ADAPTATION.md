# Campeones en los modos competitivos

Los 38 campeones del registro de campaña tienen perfil competitivo y atlas propio. Convergencia — Guerra de Cristales y Coliseo usan las mismas estadísticas base por rol, independientemente del nivel, equipo, talentos o poderes de fundador de campaña. Nano GM y Facu GM siguen siendo exclusivos de sus respectivos titulares.

## Adaptación de habilidades

Los cuatro marcos de habilidades (tanque, asesino, mago y soporte) se combinan con diez especialidades. Cada campeón conserva su nombre, paleta, arte, motivo narrativo y una firma con contrapartida. Esto es una adaptación explícita: las invocaciones, transformaciones, pasivas y cuatro habilidades originales de cada campeón de campaña **no se han portado íntegramente**. Los nombres competitivos describen el marco y el motivo; los detalles del selector exponen el efecto real.

## Especialidades y contrapartidas

| Especialidad | Regla |
|---|---|
| Custodia | Tus escudos absorben un 15% más. Mientras tienes escudo te mueves un 8% más lento. |
| Remate | Tus ataques básicos infligen un 18% más a objetivos por debajo del 35% de vida y un 8% menos a los demás. |
| Distancia | Tus ataques básicos infligen un 12% más más allá del 60% de tu alcance y un 12% menos de cerca. |
| Sustento | Tus ataques básicos infligen un 10% menos y recuperan un 8% del daño efectivo causado. |
| Cadencia | Cada tercer ataque básico inflige un 30% más; los otros dos infligen un 15% menos. |
| Contención | Tus ataques básicos infligen un 10% menos y ralentizan un 30% durante 0,45 segundos. |
| Impulso | Tus ataques básicos infligen un 10% más mientras te mueves y un 10% menos estando quieto. |
| Restauración | Tus curaciones restauran un 20% más; tus ataques básicos infligen un 12% menos. |
| Concentración | Tu zona persistente inflige un 25% más por pulso, pero dura 4 segundos en vez de 5. |
| Descarga | Tu definitiva inflige un 15% más, pero su recarga aumenta de 32 a 37 segundos. |

## Asignación de campeones

| Campeón | Rol | Firma | Especialidad |
|---|---|---|---|
| Aldric | tanque | Juramento del Bastión | Custodia |
| Kael | guerrero | Filo Oportunista | Remate |
| Thalen | mago | Convergencia Elemental | Concentración |
| Elyra | soporte | Gracia del Alba | Restauración |
| Segador | tanque | Siega Vital | Sustento |
| Axiom | mago | Código Residual | Concentración |
| Ismara | soporte | Tercer Presagio | Cadencia |
| Musashi | guerrero | Lectura del Rival | Remate |
| Sylva | guerrero | Paso de Cazadora | Impulso |
| Ilvar | mago | Diezmo de Almas | Sustento |
| San Martín | guerrero | Avance Libertador | Impulso |
| Eren | guerrero | Impulso Imparable | Impulso |
| Ynara | soporte | Santa Paciencia | Restauración |
| Myla | mago | Yogur Pegajoso | Contención |
| Brasa | mago | Presión de Caldera | Concentración |
| Garren | tanque | Custodia de Hierro | Custodia |
| Morwen | mago | Sal y Resina | Contención |
| Tobías | soporte | Lumbre Protectora | Custodia |
| Iria | mago | Tensión del Hilo | Concentración |
| Vesper | guerrero | Costura Final | Remate |
| Nahir | guerrero | Espejo de Tres Golpes | Cadencia |
| Baltra | tanque | Escafandra de Juramentos | Custodia |
| Maura | tanque | Raíz Persistente | Sustento |
| Dáriel | soporte | Armonía Reparadora | Restauración |
| Orsa | guerrero | Ritmo de Arbalesta | Cadencia |
| Tibor | mago | Enjambre Obstinado | Contención |
| Zahra | mago | Vapor Condensado | Concentración |
| Renko | tanque | Último Nombre | Descarga |
| Sira | mago | Rumbo Calculado | Distancia |
| Nano GM (exclusivo) | mago | Juicio del Umbral | Descarga |
| Facu GM (exclusivo) | guerrero | Presión Abisal | Remate |
| Aurelia | mago | Distancia Solar | Distancia |
| Khepri | guerrero | Ritmo de Quitina | Cadencia |
| Velmira | soporte | Máscara Compasiva | Restauración |
| Vhal | mago | Horizonte Estelar | Distancia |
| Bront | tanque | Placas de Ciudadela | Custodia |
| Oriel | soporte | Umbral Protector | Custodia |
| Saelis | soporte | Plumaje Vital | Restauración |

## Verificación

`node tests/competitive-roster.test.js` comprueba cobertura contra las fuentes actuales de campaña, estadísticas base iguales dentro de cada rol, metadatos de exclusividad, compatibilidad de especialidades y que todos los recortes y clips pertenecen al PNG real del campeón. Estas comprobaciones estructurales no equivalen a una aprobación subjetiva de calidad artística ni a demostrar equilibrio competitivo; las pruebas del motor y los enfrentamientos simulados verifican las mecánicas.
