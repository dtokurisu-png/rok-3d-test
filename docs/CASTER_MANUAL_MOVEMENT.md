# R.O.K. 3D — Etapa 4: movilidad manual de casters
Fecha: 2026-11-03

## Alcance
Se añadió un modo de **prueba manual WASD** a la Arena 2.5D para Chiara (rival) y Lioren (aliado). Es independiente del motor de combate automático, que se **pausa** durante el control manual. Este trabajo **no** crea las futuras composiciones de ataque, casteo o defensa: el usuario decidirá con el asistente los fotogramas y huesos de cada una.

## Uso
1. Abrir `arena-25d.html`. La barra superior de navegación entre herramientas se retiró **solo de la Arena**, dejando el campo libre.
2. El selector pequeño **Lioren / Chiara** está en la esquina inferior derecha, encima del pad de cuatro botones.
3. **No hay casilla de activación.** Pulsar W/A/S/D en el teclado o mantener pulsado un botón direccional activa automáticamente el control manual y pausa el combate.
4. Mantener pulsados W (07), S (06), A (15) o D (16), con teclado, ratón o dedo. El desplazamiento empieza incluso si todavía están cargando los FBX; si falla un clip, se utiliza temporalmente el Idle.
5. El desplazamiento responde incluso mientras se cargan los FBX. Si uno falla, se mueve con Idle de respaldo y el estado del panel indica el número del clip que falta. Sin teclas: `Standing Idle.fbx` de `assets/animations/casters/shared/`, adaptado al rig del caster, con fallback a Idle del GLB si la adaptación falla.
6. La versión **v0.9.17 · WASD** identifica el cambio. **Repetir** o **Pausar** finalizan el control manual y devuelven el estado normal del tester.

## Separación técnica
- `caster-mobility.js`: entrada de teclado, transiciones de movimiento, límites y modos.
- `caster-movement-loader.js`: carga el ZIP original para las animaciones 06 y 07, y los FBX compartidos para 15, 16 y nuevo Standing Idle.
- `arena-25d.html`: monta el panel, conecta el retargeter `adaptAnimationFBX`, pausa `updateDuel` cuando se activa el modo manual y actualiza el mixer del caster manual en su loop.
- Se conserva la posición y orientación de base del caster; el modelo se desplaza en el espacio de la arena. W se interpreta hacia el rival según el bando.
- Las decoraciones del escenario siguen siendo puramente visuales; no se añaden obstáculos físicos.
- No se han renumerado clips ni borrado material anterior.

## Todavía pendiente
- Ataque manual 02, reacción de daño, defensa Espacio/23, muerte 08, casteo compuesto 21+22: pertenecen a las siguientes decisiones y etapas.
- Verificar visualmente, sobre los rigs GLB reales, que los clips 15/16 corresponden a los movimientos laterales deseados: ambos nombres originales dicen «Right Strafe».
- Probar WebGL, retarget y FPS en navegador, incluyendo el cambio de caster y la restauración del combate.
- El control manual está diseñado como laboratorio. No traslada todavía estas teclas a R.O.K. Lite ni implementa red o sincronización PvP.

## Corrección de visibilidad (2026-11-03)
Anteriormente el panel estaba dentro del contenedor `#details` (cerrado por defecto), sin botones de dirección. Se movió fuera de ese contenedor y ahora se posiciona de forma fija sobre el campo. Se añadieron controles `pointerdown`/`pointerup`/`pointercancel` con captura para permitir mantener pulsadas las flechas y una señal explícita de carga/estado. No se alteró la simulación de combate.

## Ajuste compacto v0.9.17
Se eliminó del Tester la navegación global `studio.js`/`studio.css`, que ocupaba toda la parte superior. El pad WASD quedó reducido a los cuatro botones en la esquina inferior derecha, con un selector pequeño de Chiara/Lioren y control de velocidad. La primera pulsación del teclado o del pad activa el control: ya no existe `casterMoveEnable`. La traslación es independiente de los FBX, y una prueba dinámica con objetos simulados confirmó W → Z y A → X incluso sin resolver la promesa de carga. Falta validar WebGL y retarget real en el navegador.
