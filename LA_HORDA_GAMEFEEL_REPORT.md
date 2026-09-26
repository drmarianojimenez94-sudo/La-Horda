# LA HORDA — Informe de game feel

> Qué se cambió para que el combate se **sienta** mejor, cómo se verificó y qué necesita una persona con un
> celular en la mano. Nada de esto es "más partículas porque sí": cada cambio responde a una pregunta de
> lectura (¿qué me pegó?, ¿a quién mato primero?, ¿de dónde viene?, ¿valió la pena?).

## 1. Peso del golpe

- **4 niveles de impacto** (básico → habilidad → crítico/pesado → ulti) con hit-stop, retroceso, tambaleo y
  sangre escalonados. La ulti congela el tiempo **una vez** por lanzamiento (no por enemigo): se siente, no marea.
- El micro hit-stop de las habilidades es **1 por lanzamiento**; antes un tajo que tocaba a 12 enemigos podía
  encadenar 12 pausas.
- Los élites no pierden su ataque por un crítico (sin tambaleo): el crítico se siente, pero el aviso del élite
  sigue siendo confiable.
- Campeones "pesados" (Tanque, Segador, titán de Eren) tienen más retroceso y un leve temblor hasta en el básico.
- **HUMAN TEST REQUIRED:** si el hit-stop del crítico (36–50 ms) se siente "trabado" en celulares de 60 Hz.

## 2. Gore que informa

- La sangre, las manchas y los cadáveres **dicen algo**: el material (sangre, icor, hueso, escarcha, ceniza,
  esporas) cuenta qué mataste, el tipo de muerte (quemado, congelado, electrocutado, desmembrado) cuenta **cómo**.
- Los cadáveres son un recurso visible del Nigromante y del Resucitador: ver cadáveres en el piso ya es información.
- Presupuesto fijo (celular 90 manchas / 18 cadáveres) y cadáveres horneados: el gore no cuesta cuadros (medido:
  Micelial nivel 9, 11 ms de dibujo, igual que sin gore).
- Muertes por quemadura con `ctx.filter` topeadas por cuadro (2 en celular) para evitar picos.

## 3. Lectura del peligro

- **Roles enemigos** con un lenguaje único: rombo + ícono + anillo del color del rol. El Hechicero explica cada
  rol la primera vez. Los de apoyo fuera de cámara tienen **flecha en el borde** (como élites y jefes).
- **Avisos** revisados contra una norma (rápido 0,4–0,7 s, élite 1 s, jefe 1,5–2 s). Arreglados: salto del Sabueso
  (260 → 420 ms) y picada del Dragón de Bronce (sin aviso → 0,45 s).
- **Oleada con dirección:** "¡Se acerca una oleada desde el norte!" + flecha roja 1,5 s antes; el grupo entra por
  ese lado. En la Fortaleza y el Micelial (puertas/túneles propios) el aviso no promete una dirección falsa.

## 4. Ritmo (montaña rusa)

- Cada nivel: calentamiento → escalada → **oleada** → **respiro** → escalada → **clímax**. El promedio de
  enemigos por nivel queda casi igual (×1,025) para no romper la dificultad calibrada; cambia la forma.
- En el respiro, si el grupo viene golpeado, cae una poción cerca. Nivel 1 sin oleada.
- **HUMAN TEST REQUIRED:** si el respiro (12% del nivel) se siente como descanso o como "bajón".

## 5. Red de seguridad

- **Curación de emergencia** (botón secundario, tecla Q): 1 por nivel, 30% al instante + 20% en 2,5 s. El botón
  late cuando estás por debajo del 35%. No suma a la calificación (no se "farmea").
- Posición del botón: abajo a la izquierda de las habilidades, sin tapar ninguna (verificado por test de solapamiento).

## 6. Progresión que se ve

- **Evolución de habilidades 1/3/5/7/10**: cada hito se nota en juego (estado propio del campeón, recorte de
  enfriamiento al rematar, estallido de Resonancia, "★ FORMA FINAL" cada 3er lanzamiento) y en el panel (hitos
  encendidos + el próximo explicado, legible en celular).
- **Proyectiles con forma propia** por campeón: una flecha no se parece a una bala ni a un alma. En un combate de 4
  jugadores se distingue de quién es cada disparo.

## 7. El entorno como arma

- Urnas, barriles, ánforas, cristales, vainas y jarrones que estallan **contra la horda**, avisan 0,7 s y se
  encadenan. Invitan a jugar con el posicionamiento: atraer a la horda y patear.
- Combos con reacciones: ánfora (moja) + rayo = Conducción; cristal (congela) + golpe pesado = Quiebre.

## 8. Cofre y botín

- Ceremonia por rareza (cae, tiembla, se abre, revela) con sonidos distintos por categoría. El Único y el Mítico
  tienen la ceremonia más larga; el común casi no interrumpe.
- **HUMAN TEST REQUIRED:** duración ideal de la ceremonia en celular (hoy ≈ 3 s con un común y ≈ 7 s con un Único, contando la caída, el temblor, la apertura y la revelación; tocar la acelera).

## 9. Social

- Chat de la Sala con 6 frases rápidas de un toque (no hace falta abrir el teclado del celular), texto libre de
  120 caracteres, anti-spam en el servidor y "silenciar" del anfitrión. Input a 16 px para que iOS no haga zoom.

## 10. Checklist para probar con una persona

- [ ] ¿Se distingue a primera vista un sanador/invocador/comandante en una horda de 40?
- [ ] ¿La curación de emergencia se encuentra sin mirar?
- [ ] ¿El aviso de oleada se ve antes de que llegue el grupo?
- [ ] ¿Patear un barril con la horda atraída se siente como una jugada, no como un accidente?
- [ ] ¿La "Forma final" se nota sin leer el texto?
- [ ] ¿El gore resulta dark-fantasy y legible, no sucio ni confuso?
- [ ] ¿El chat es cómodo con una mano en un iPhone apaisado?
