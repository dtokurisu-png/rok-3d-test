# R.O.K. 3D — Pendientes guardados

Actualizado: 2026-11-03. Estos trabajos se posponen deliberadamente y **no deben implementarse mientras se resuelven las tareas activas**, salvo nueva indicación.

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
- [ ] **9. Controles universales de huesos bajo el reproductor**: hombros, brazos, antebrazos, muñecas/manos, torso, cabeza, muslos, pantorrillas y pies; corrección por animación y guardado explícito.

## Completado previamente

- [x] **1. Reacción al recibir daño de Chiara y Lioren / ausencia de reacción con defensa:** el usuario confirmó que ya está resuelto.
- [x] **Priorización base de objetivos por alcance — v0.9.26:** comprobada por el usuario.
- [x] WASD 3.8, ataque 1 s, alcance de caster 3, círculo gradual, objetivo comprometido al inicio, defensa por Shift y capas de torso/piernas.

La lista activa y el historial permanecen en [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md). Esta lista es el respaldo claro de los trabajos aplazados.
