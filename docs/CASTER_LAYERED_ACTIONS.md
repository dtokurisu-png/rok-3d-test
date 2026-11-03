# R.O.K. 3D — Casters: locomoción por capas, escudo y daño 09
**Implementación:** 2026-11-03 · Arena 2.5D v0.9.22

## Comportamiento

Chiara y Lioren comparten la misma lógica de acciones y el `AnimationMixer` propio de cada GLB.

- **W/A/S/D:** las pistas de cadera y piernas continúan reproduciéndose y el modelo se sigue desplazando en el mundo.
- **Espacio + caminar:** el torso, los brazos y la cabeza usan la animación de ataque 02. Los clips del tren inferior continúan sin reiniciarse. Al terminar el ataque, la mitad superior vuelve a la animación de locomoción vigente.
- **Shift + caminar:** la mitad superior utiliza la animación de defensa 23 a **1,8×**, una sola vez (`LoopOnce`) y con `clampWhenFinished=true`, por lo que conserva su último fotograma mientras la guardia permanezca activa. Las piernas siguen caminando y el desplazamiento continúa.
- **Escudo frontal:** aparece inmediatamente con Shift, frente al personaje y siguiendo su orientación. Es una barrera circular turquesa translúcida con aros concéntricos; desaparece en cuanto termina la guardia. Es visual, no un nuevo FBX.
- **Reacción 09:** cuando el caster recibe daño sin defenderse, ejecuta una reacción aditiva exclusivamente en cuello y cabeza, reutilizando la técnica de máscaras usada para las invocaciones. No cancela las piernas ni el ataque. Con Shift activo no reproduce la reacción y se bloquea el daño provisional.
- **Muerte 08:** se conserva la acción de muerte, que interrumpe las demás pistas del caster al quedar derrotado.
- **Combate de invocaciones:** no se pausa; proyectiles, IA y el resto de mixers continúan.

## Arquitectura

`caster-animation-layers.js` separa los tracks del retarget por **huesos**, nunca por fotogramas de origen ni por modificaciones a los FBX. La máscara inferior contiene hips, muslos, pantorrillas, pies y dedos; la superior contiene las rotaciones restantes (columna, pecho, cuello, cabeza y brazos). La posición de Hips permanece siempre en el tren inferior.

`caster-mobility.js` mantiene el desplazamiento WASD durante los intervalos de ataque y defensa, registra los clips ya cargados y controla las prioridades: defensa mantenida cancela el ataque que todavía estuviera en fase de preparación. El escudo se crea con geometría Three.js y permanece adjunto al `outer` del caster.

`caster-movement-loader.js` carga las fuentes 02, 06, 07, 08, 09, 15, 16, 23 y Standing Idle usando el mismo retargeter de la Arena. `arena-25d.html` conecta reacción de daño, reinicio y ambos modelos GLB.

## Decisiones provisionales, aún no definitivas

- Defensa 23 = `Sword And Shield Impact.fbx` como **base temporal de la parte superior**. Los intervalos exactos y mezclas que defina el usuario todavía se pueden ajustar directamente.
- La defensa sigue bloqueando **100 % del daño** mientras se mantiene Shift, solo para probar las mecánicas; el balance definitivo no se ha fijado.
- El ataque 02 sigue lanzando el proyectil al 55 % de su duración, con daño y alcance de prueba previamente establecidos.
- La reacción 09 se enmascara a cabeza y cuello. El usuario puede modificar después la máscara exacta sin alterar la locomoción.

## Validación

Se verificaron sintaxis JS, referencias y máscaras; una simulación del sistema de capas confirmó que Hips.position y las piernas están exclusivamente en la pista inferior, que la acción superior de defensa es `LoopOnce` a 1,8× con último fotograma retenido, y que el escudo se coloca delante y se oculta al soltar Shift. La reacción 09 produjo únicamente pistas de cabeza/cuello con mezcla aditiva. Las pruebas del repositorio se actualizaron para estas invariantes. **Queda pendiente la inspección visual real en WebGL con los GLB y los FBX de ambos casters.**

## Etapa v0.9.23 — Velocidades y alcance

- **Chiara y Lioren:** velocidad inicial de desplazamiento **3.8 unidades/s** (ajustable desde el panel de la Arena).
- **Cadencia del ataque manual:** **1 segundo** entre ataques. El tramo visual del clip 02 se escala para finalizar en 1 segundo, en lugar de depender de la duración original del FBX. El lanzamiento de prueba se produce al **55 % del ciclo**.
- **Alcance efectivo:** **2 unidades** de distancia euclidiana en el plano X/Z. El disparo manual elige la invocación rival más cercana dentro de ese radio; si no hay una invocación en rango, puede alcanzar al caster rival que esté dentro del mismo radio. Sin enemigos dentro de 2, la animación de ataque puede ejecutarse pero no se crea un proyectil con objetivo inválido.
- **Anillo de alcance:** se vuelve visible progresivamente si una invocación enemiga se aproxima entre **4.5 y 2 unidades**. En 2 o menos alcanza su máxima opacidad. Se mantiene oculto si no hay invocaciones enemigas cercanas.
- **Marcador de objetivo:** cuando la invocación enemiga más cercana entra dentro de las 2 unidades, muestra dos anillos pequeños dorados en el suelo. Al salir de rango, el marcador desaparece. Se reutiliza su geometría para evitar asignaciones por fotograma.
- El nuevo indicador está desacoplado de la IA de las invocaciones y de la lógica de los duelos de invocaciones. Solamente la mecánica del disparo manual del caster permite impactar a una invocación enemiga en rango.
- La prueba de lógica verificó avance **0.19 unidades en 0.05 s** a velocidad 3.8, dos ataques separados por 1 s, y el marcador pasando de oculto a parcialmente visible y completamente visible a 2 unidades.

### Pendiente nuevo (no implementado)
**Alerta de amenaza rival:** cuando una invocación enemiga tenga al caster dentro de su alcance efectivo, mostrar un pequeño símbolo **¡!** junto al caster como advertencia para defenderse. Debe utilizar el alcance real de la invocación y actualizarse al cambiar la distancia, el objetivo o la vida. No confundir esta futura alerta con el marcador dorado de objetivo del ataque propio.
