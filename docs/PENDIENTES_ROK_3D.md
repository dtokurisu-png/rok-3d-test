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
- [ ] **7. Depurar el ataque de caster**: principalmente un brazo, sin movimientos extraños de preparación ni regreso a pose base.
- [ ] **8. Corregir desplazamiento invertido en el visor** en los ejes adelante/atrás y derecha/izquierda.
- [ ] **9. Controles universales de huesos bajo el reproductor**: hombros, brazos, antebrazos, muñecas/manos, torso, cabeza, muslos, pantorrillas y pies; corrección por animación y guardado explícito.

## Completado previamente

- [x] **1. Reacción al recibir daño de Chiara y Lioren / ausencia de reacción con defensa:** el usuario confirmó que ya está resuelto.
- [x] **Priorización base de objetivos por alcance — v0.9.26:** comprobada por el usuario.
- [x] WASD 3.8, ataque 1 s, alcance de caster 3, círculo gradual, objetivo comprometido al inicio, defensa por Shift y capas de torso/piernas.

La lista activa y el historial permanecen en [DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md). Esta lista es el respaldo claro de los trabajos aplazados.
