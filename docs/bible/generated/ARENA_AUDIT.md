# Auditoría de arenas (AUTO-GENERADO)

> Generado por `node tools/bible/arena-validator.js`. No editar a mano.
> Automated geometry/spawn/exploration checks on the real engine + blueprint completeness. PASS is not a design approval.

Lámina: verde = caminable y alcanzable · rojo = caminable pero inalcanzable (bolsillo) · amarillo = sólido pintado con colisión · magenta = sólido sin colisión / aparición inválida · celeste = aparición válida · blanco = inicio.

| # | Arena | Validador | FAIL | WARN | Diseño | Celdas | Bolsillos | Lámina |
|---|---|---|---|---|---|---|---|---|
| 1 | Ciudad Maldita (`ciudad`) | **PASS** | 0 | 0 | PASS | 9585 | 0 | ![ciudad](arenas/ciudad.webp) |
| 2 | Fábrica Sin Fin (`fortaleza`) | **WARNING** | 0 | 1 | PASS | 12822 | 7 | ![fortaleza](arenas/fortaleza.webp) |
| 3 | Ruinas Célticas / Élficas (`bosque`) | **PASS** | 0 | 0 | PASS | 4335 | 0 | ![bosque](arenas/bosque.webp) |
| 4 | Reino Fúngico (`micelial`) | **PASS** | 0 | 0 | PASS | 2567 | 0 | ![micelial](arenas/micelial.webp) |
| 5 | Arena Gélida (`hielo`) | **PASS** | 0 | 0 | FIX | 4308 | 0 | ![hielo](arenas/hielo.webp) |
| 6 | Arena Acuática (`acuatica`) | **PASS** | 0 | 0 | PASS | 4319 | 0 | ![acuatica](arenas/acuatica.webp) |
| 7 | Laberinto (`laberinto`) | **PASS** | 0 | 0 | PASS | 3838 | 0 | ![laberinto](arenas/laberinto.webp) |
| 8 | Abismo (`abismo`) | **WARNING** | 0 | 1 | PASS | 1838 | 0 | ![abismo](arenas/abismo.webp) |
| 9 | Minas Profundas (`minas`) | **PASS** | 0 | 0 | PASS | 4543 | 0 | ![minas](arenas/minas.webp) |
| 10 | Arena Infernal (`infernal`) | **PASS** | 0 | 0 | PASS | 4280 | 0 | ![infernal](arenas/infernal.webp) |

## Detalle

### Ciudad Maldita — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 9585 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 80 sólidos pintados con colisión
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Fábrica Sin Fin — WARNING
- ✔ **PASS** [blueprint] ficha completa
- ⚠ **WARNING** [geometry] área caminable conexa — 12822 celdas; 7 bolsillos inalcanzables: 1770@(-8,-3888) 1038@(8,-2920) 1992@(-9,-1958) 2294@(4,-1068) 280@(4,-336) 1170@(4,383) (geometría con compuertas)
- ✔ **PASS** [geometry] si se ve sólido, es sólido — sin fondo pintado: el dibujo sale de la misma geometría que la colisión (js/arenas/fortaleza/)
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Ruinas Célticas / Élficas — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 4335 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 10 sólidos pintados con colisión
- ✔ **PASS** [variants] variantes por semilla sin bolsillos — 8 semillas, 4 trazados distintos
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Reino Fúngico — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 2567 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 17 sólidos pintados con colisión
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Arena Gélida — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 4308 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 17 sólidos pintados con colisión
- ✔ **PASS** [variants] variantes por semilla sin bolsillos — 8 semillas, 4 trazados distintos
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Arena Acuática — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 4319 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 7 sólidos pintados con colisión
- ✔ **PASS** [variants] variantes por semilla sin bolsillos — 8 semillas, 4 trazados distintos
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Laberinto — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 3838 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 4 sólidos pintados con colisión
- ✔ **PASS** [variants] variantes por semilla sin bolsillos — 8 semillas, 4 trazados distintos
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Abismo — WARNING
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 1838 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — sin fondo pintado: el dibujo sale de la misma geometría que la colisión (js/arenas/abismo/)
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ⚠ **WARNING** [explore] héroes siempre en zona caminable — 113 cuadros-héroe dentro de colisión (> 4 u) [["tanque",324,616,597,""],["tanque",325,623,598,""],["tanque",325,629,599,""],["tanque",321,637,600,"abHang"],["tanque",321,637,601,"abHang"]] (arena con caídas: colgado del borde)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Minas Profundas — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 4543 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — sin fondo pintado: el dibujo sale de la misma geometría que la colisión (js/arenas/minas/)
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

### Arena Infernal — PASS
- ✔ **PASS** [blueprint] ficha completa
- ✔ **PASS** [geometry] área caminable conexa — 4280 celdas; 0 bolsillos inalcanzables
- ✔ **PASS** [geometry] si se ve sólido, es sólido — 11 sólidos pintados con colisión
- ✔ **PASS** [variants] variantes por semilla sin bolsillos — 8 semillas, 4 trazados distintos
- ✔ **PASS** [spawn] apariciones válidas — 120/120 válidas; 0 dentro de colisión, 0 inalcanzables
- ✔ **PASS** [explore] sin NaN — 0
- ✔ **PASS** [explore] nadie fuera del mapa — 0
- ✔ **PASS** [explore] héroes siempre en zona caminable — 0 cuadros-héroe dentro de colisión (> 4 u)
- ✔ **PASS** [explore] nunca atrapado — 1800 cuadros de exploración

