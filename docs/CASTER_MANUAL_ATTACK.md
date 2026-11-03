# R.O.K. 3D — Etapa 5: primer ataque manual y muerte del caster
Fecha: 2026-11-03

## Funciones incorporadas en Arena 2.5D

- **Espacio** o botón compacto «✦ Ataque · Espacio», situado debajo del pad WASD, activa el ataque a distancia provisional del caster seleccionado.
- Fuente: animación original **02 · Magic Heal.fbx**, adaptada al GLB real de Chiara o Lioren con el mismo retargeter de la arena.
- El ataque reproduce el clip completo una vez, con lanzamiento del proyectil al alcanzar **55 % de la duración** del clip (hito temporal **provisional**, no aprobado como composición definitiva). No permite múltiples disparos por mantener pulsado Espacio; el cooldown mínimo es 1,6 segundos o la duración del clip, la que sea mayor.
- El disparo reutiliza **launchSpell** y la resolución existente de proyectiles. Apunta **solo al caster enemigo** por ahora, con **1 punto de daño de prueba**. No se implementaron todavía las habilidades definitivas, la prioridad de objetivos ni el balance final.
- Mientras se reproduce el ataque, se interrumpe temporalmente el movimiento del caster seleccionado; el resto del combate, los FX, las animaciones y la IA siguen actualizándose.
- **08 · Sword And Shield Death.fbx** se carga con prioridad y se reproduce una sola vez cuando un caster queda derrotado; el contador de reinicio de la arena permanece operativo. Si no se logra adaptar, conserva el comportamiento anterior de detención de animación.
- Se mantienen el Idle nuevo, W/S/A/D (07/06/15/16), los límites de la arena y el control manual no bloqueante.
- Las fuentes se cargan desde los archivos del repositorio; no se modificaron los FBX ni sus keyframes.

## No incluido todavía

**Defensa con Espacio y 23, casteo compuesto 21+22 y reacción compuesta al daño** permanecen sin cambios. Las recetas exactas de composición se establecerán junto con el usuario cuando indique fotogramas y máscaras de huesos. No se crea un editor automático de composiciones.

## Validaciones

Comprobaciones de sintaxis y referencias a los archivos de la arena y el controlador; pruebas de regresión para la conexión de F/02, el proyectil y la muerte 08. **No se ha verificado visualmente en un navegador WebGL**, por lo que la adaptación real del FBX, el fotograma de lanzamiento y la caída requieren prueba en el tester.

## Controles corregidos (v0.9.20)
- **Espacio**: ataque 02.
- **Shift izquierdo o derecho**: defensa, reservada para la composición 23 definida posteriormente con el usuario; **aún no reduce daño ni reproduce una defensa definitiva**.
- **F**: sin asignación de ataque.
- El alcance definitivo del caster no se ha configurado en esta corrección.

## Corrección funcional v0.9.21 — Espacio y Shift

- **Espacio** ejecuta la lógica del ataque desde el primer fotograma, incluso si el FBX 02 no ha terminado de descargarse o falla el retarget. El proyectil sale al 55 % de un tiempo lógico de **0,8 s** si el clip real no está disponible; cuando está cargado, se usa su duración.
- **Shift izquierdo / derecho mantenido** activa `manualDefending` en el caster seleccionado. Al levantar ambas teclas termina la defensa. El botón compacto **Defensa · Shift** admite mantener pulsado con ratón o dedo.
- La defensa provisional **bloquea el 100 % del daño entrante** mientras esté activa; esto permite probarla claramente sin decidir aún el balance definitivo. Se evalúa en la función central `damage()`, también para proyectiles comprometidos. Se restablece en cada reinicio/cambio de caster.
- Si el FBX 23 se adapta, se reproduce provisionalmente durante la defensa. Si no está disponible, el bloqueo **sigue funcionando** sin el clip visual.
- Defenderse interrumpe un ataque todavía en preparación para evitar disparar mientras se mantiene la guardia.
- Estas mecánicas de prueba **no son la composición final** de 23 ni el alcance, ventana de guardia, consumo de recursos, reducción definitiva o clips combinados que definirá el usuario.
- Revisión estática y simulación de eventos de Espacio y Shift completadas; **la comprobación visual en WebGL sigue pendiente**.
