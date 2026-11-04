# R.O.K. 3D — Pendientes guardados

**Para retomar en otro chat:** [Lista de comprobación completa y estado actual](./CONTINUIDAD_CHAT_NUEVO.md). El siguiente trabajo es el **sistema de escenarios 15×30**; no tocar el visor de animaciones.

Actualizado: 2026-11-03. Estos trabajos se posponen deliberadamente y **no deben implementarse mientras se resuelven las tareas activas**, salvo nueva indicación.

## Nueva prioridad de trabajo

**Ahora:** continuar completando el **sistema de escenarios de Arena 2.5D**. El usuario indicará los ajustes concretos del escenario. No tocar el visor ni modificar las animaciones durante esta etapa.

## Próxima etapa: gestor de escenarios 15 × 30 (decisión de producto, aún no implementada)

**Orden de trabajo acordado (2026-11-03):**

1. [ ] **Unificar las dimensiones del editor con la arena:** 15 columnas × 30 filas (450 casillas); corregir el esquema JSON y las conversiones espaciales para que el escenario encaje en el tester y, después, en R.O.K. Conservar compatibilidad o definir una migración explícita para escenarios anteriores de 9×18. **Incompatibilidad detectada:** `arena-scene-overlay.js` todavía exige JSON `arena.columns === 9` y `arena.rows === 18` aunque la arena ya es 15×30.
2. [x] **Área jugable despejada — implementado en código, pendiente aprobación visual:** ningún prop ni su volumen con efectos puede intersectar las 450 casillas jugables; las decoraciones se construyen fuera del rectángulo 15×30, con zona exterior de hasta X±45 y Z±65. Inserción, arrastre, rotación, escala, duplicación y lectura/exportación de JSON respetan la zona protegida. Los guardianes futuros siguen sin implementar. El tester rechaza escenarios cuyos modelos/efectos invadan la arena. Regla compartida en `scene-placement-rules.js` y pruebas en `tests/scene-placement-rules.test.mjs`.
3. [x] **Background ambiental gótico — contenedor implementado, pendiente validación visual y textura definitiva:** envolvente independiente del tablero y de los props, recinto rectangular con paredes y techo arqueado; valores iniciales **70 × 140**, altura de pared 18 y elevación del arco 12 (cumbre 30). Piso exterior a la misma cota de la arena, sin cubrir sus 450 casillas. Controles de ancho (30–120), altura, arco, visibilidad y ruta local de textura; proporción largo = 2 × ancho. Configuración guardada en JSON del escenario y reconstruida por el tester. **La imagen de vitrales zafiro ya está publicada en WebP optimizado y configurada como textura predeterminada.** En el futuro podrán existir backgrounds exteriores de montañas/horizontes. Motor en `scene-background.js`, prueba en `tests/scene-background.test.mjs`. No altera cámara ni colisiones.
**Actualización de texturas del escenario (2026-11-03):** [x] se incorporaron físicamente al repositorio `assets/texturas/Panorama gótica de vitrales zafiro.webp` (paredes y bóveda) y `assets/texturas/Pavimento ornamental de piedra azul y beige.webp` (pavimento del plano de combate 15×30). Son versiones WebP optimizadas directamente a partir de las dos imágenes suministradas por el usuario; los archivos PNG originales no se modificaron. El editor dispone de controles independientes de desplazamiento horizontal y vertical de la textura gótica (offset UV de -1 a 1), guardados en el JSON y reproducidos por el tester. [ ] **Pendiente aprobación visual** del ajuste y pavimento en GitHub Pages. Se conserva el ancho mínimo del recinto en 30.

4. [ ] **CÁMARAS — después de estabilizar el escenario:** diseñar y ajustar las **dos vistas predeterminadas** mencionadas por el usuario, sus límites, encuadres, clipping y convivencia con el background. **No alterar cámaras en esta primera fase** hasta cerrar el diseño y dimensiones del escenario.

**Estado:** tareas especificadas y guardadas; no se ha modificado código del escenario, visor ni la arena en esta conversación. El usuario pidió primero comprobar que entendimos estas tres tareas y guardar la cámara como siguiente pendiente.

## Proyecto aplazado: Creador de animaciones

- [ ] **Añadir en el futuro un botón/sección «Creador de animaciones»**, separado del flujo de prueba actual. **NO implementarlo todavía**.
- [ ] **Iniciar desde la Pose T ya integrada** en el visor, aprovechando el rig y el modelo existentes, sin reconstruirlos.
- [ ] **Editor por fotogramas clave:** establecer poses a lo largo de una línea de tiempo, interpolar entre fotogramas, reproducir, revisar, corregir y guardar nuevas animaciones para no depender de encontrar todos los movimientos en Mixamo.
- [ ] **Cinemática inversa (IK) para controles clave, no cientos de sliders:** pies/piernas (muslos, rodillas, tobillos), cadera/pelvis, torso, cabeza, brazos/codos y muñecas/manos. Mover objetivos IK y dejar que la cadena de huesos resuelva la postura.
- [ ] **Centro de gravedad / control de pelvis:** elevar, bajar, inclinar o desplazar el cuerpo sin tener que posicionar manualmente cada hueso. Las rodillas deben flexionarse automáticamente cuando el centro baja; las piernas deben extenderse al subir y los pies deben seguir el suelo cuando corresponda.
- [ ] **Apoyo y límites anatómicos:** fijación de pies al suelo (*foot planting*), detección de contacto, límites de extensión de piernas y articulaciones, posibilidad explícita de levantar un pie cuando el movimiento lo requiera, y control del equilibrio para evitar poses imposibles.
- [ ] **Editar y crear clips nuevos sin destruir los originales:** reutilizar las animaciones y modelos ya cargados, mantener cambios del proyecto/versionados en GitHub cuando se defina el flujo de guardado, y prever una exportación utilizable por R.O.K. (formato por acordar).
- [ ] **Interfaz sencilla y gradual:** pocos manipuladores IK visibles, selección de parte corporal, línea de tiempo y controles básicos de reproducir/registrar pose/guardar; nada de un panel abrumador de huesos.
- [ ] **Diseñar primero la arquitectura del creador:** representación de keyframes, solver IK y dependencias del rig, cinemática de suelo, persistencia y pruebas, **antes de empezar a programar**.

**Relación con la antigua tarea 9:** los «controles universales de huesos bajo el reproductor» dejan de ser una implementación inmediata; sus objetivos se integran en este futuro **Creador de animaciones con IK**, más útil que un conjunto extenso de controles manuales.

**Importante:** ni el botón, ni el motor IK, ni el editor por fotogramas están implementados todavía. El visor queda congelado en su estado actual mientras trabajamos el escenario.

## Pospuestos

- [ ] **Colisiones entre invocaciones:** collider físico, separación y navegación para rodear unidades sin atravesarlas.
- [ ] **Ocupación de nexos:** no invocar encima de otra invocación; los nexos vacíos siguen siendo transitables.
- [ ] **Alerta de amenaza ¡!:** avisar al caster cuando una invocación enemiga lo tiene dentro de su alcance ofensivo.
- [ ] **Modos de combate por tipo de carta — DEJAR PARA EL FINAL:** diseñar e implementar un sistema completo y configurable de perfiles de IA por clase/tipo de carta. Requiere diseño propio y no se aborda junto a la regla base de alcance.

## Trabajos activos (orden aprobado)

- [x] **5. Ampliar arena 9 × 18 → 15 × 30** — implementada en Arena v0.9.27; pendiente validación visual WebGL por el usuario.
- [x] **6. Incluir animaciones compuestas en el catálogo existente del visor** — implementadas en código las entradas 24–33: cinco de ataque violeta y cinco de defensa azul, clips combinados de piernas/torso generados en memoria y reproducibles con el inspector existente. **Pendiente validación visual con los GLB reales del usuario**.
- [x] **7. Depurar el ataque compuesto del visor (24–28)** — implementado en código: ataque 02 desde fotograma 13 (30 FPS), entrada y recuperación suaves de 0.20 s, sin pistas de ataque en el brazo izquierdo (conserva locomoción/idle). **Pendiente aprobación visual de ambos GLB**.
- [x] **8. Controles completos del visor y desplazamientos corregidos** — implementado en el visor v0.5.26: WASD a 3.8, orientación uniforme de avance, inversión lateral de los clips 15/16 corregida, Espacio para ataque compuesto y Shift mantenido para defensa por capas. **Solo animaciones**, sin proyectiles, escudo FX ni daño; reutiliza clips ya cargados y prepara los faltantes bajo demanda. Pendiente comprobación visual con Chiara y Lioren.
- [ ] **9. Controles universales de huesos — APLAZADO / REPLANTEADO:** integrar sus funciones principales dentro del futuro **Creador de animaciones con IK**, en lugar de añadir ahora muchos controles al visor. Véase el proyecto aplazado anterior.

## Completado previamente

- [x] **1. Reacción al recibir daño de Chiara y Lioren / ausencia de reacción con defensa:** el usuario confirmó que ya está resuelto.
- [x] **Priorización base de objetivos por alcance — v0.9.26:** comprobada por el usuario.
- [x] WASD 3.8, ataque 1 s, alcance de caster 3, círculo gradual, objetivo comprometido al inicio, defensa por Shift y capas de torso/piernas.

La lista activa y el historial permanecen en [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md). Esta lista es el respaldo claro de los trabajos aplazados.
