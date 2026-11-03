# R.O.K. 3D — Etapa 4: movilidad manual de casters
Fecha: 2026-11-03

## Alcance
Se añadió un modo de **prueba manual WASD** a la Arena 2.5D para Chiara (rival) y Lioren (aliado). Es independiente del motor de combate automático, que se **pausa** durante el control manual. Este trabajo **no** crea las futuras composiciones de ataque, casteo o defensa: el usuario decidirá con el asistente los fotogramas y huesos de cada una.

## Uso
1. Abrir `arena-25d.html`, expandir **Opciones** y buscar **Movilidad · Chiara / Lioren**.
2. Elegir Lioren o Chiara. Esperar a que se cargue el modelo real y el mensaje de preparación de animaciones.
3. Activar **Control manual**. Mientras está activo, la IA y el avance del combate se congelan.
4. W avanza hacia el rival (07, `Running.fbx`), S retrocede (06, `Running Backward.fbx`), A se mueve lateralmente a la izquierda (15, `Right Strafe.fbx`), D a la derecha (16, `Right Strafe (1).fbx`). Los desplazamientos diagonales se normalizan; se respetan los límites de la arena, sin rotación automática al desplazarse lateralmente.
5. Sin teclas: `Standing Idle.fbx` de `assets/animations/casters/shared/`, adaptado al rig del caster, con fallback a Idle del GLB si la adaptación falla.
6. Desactivar **Control manual** para reanudar el estado previo del combate. **Repetir**, pausa y revisión de animaciones desactivan control manual cuando corresponde.

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
