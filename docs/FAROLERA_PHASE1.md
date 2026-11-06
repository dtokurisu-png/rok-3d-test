# FAROLERA — Fase 1: inventario y alcance protegido

**Base congelada:** `dd215d6a0295bbe4033d60600f63cf6d27e6442b`.

## Autorización de cambios

- Ningún archivo existente antes del bloqueo se debe alterar sin aprobación explícita del propietario y su código de autorización establecido en la conversación.
- No almacenar el código de autorización en el repositorio, ni en HTML, JS, comentarios, archivos de configuración, tests o logs.
- El guard de CI (`scripts/farolera-scope-lock.mjs` y `.github/workflows/farolera-scope-lock.yml`) compara contra el commit base y falla si encuentra ediciones de código anterior.
- Únicamente se permiten **archivos nuevos** para prototipos aislados en `features/farolera/phase-1/`, documentación de esta fase y tests `tests/farolera-phase1*.test.mjs`.
- Este guard es una salvaguarda de CI, **no es un bloqueo criptográfico de GitHub ni impide a alguien con permiso de escritura hacer un push**. Para impedir merges se requieren reglas de protección del repositorio con check obligatorio, administradas por el propietario.

## Capas protegidas (no modificar)

- `arena-25d.html`: arena, combate, invocaciones existentes, iluminación, HUD, lógica actual de lámpara, vida/muerte, sistema de alcance.
- `index.html`, `studio.*`, `viewer-*.js`, `caster-*.js`: visores, controles, catálogo, animaciones, retargeting, casteo.
- `assets/**` y `animations/**`: todos los modelos, mallas, texturas, clips, archivos originales y las exportaciones.
- `scene-*.js`, `asset-*.js`, `arena-*.js`, CSS, JSON de escenarios y los tests existentes.
- Todos los demás archivos anteriores al bloqueo quedan protegidos por defecto.

## Fase 1 — resultados de inspección de código

Fuentes existentes identificadas, **sin alterarlas**:
- Modelo de Farolera: `assets/models/casters/farolera/chiara_idle.glb`.
- Animaciones: `assets/animations/casters/farolera/ROK_PUBLICAR_ANIMACIONES.zip` y `animations/farolera-pack.json`.
- En la arena, `findLantern(model)` busca un hueso `RightHand` y mallas no skinned descendientes; si no encuentra, usa nombres compatibles con `tripo_node.*(?:001|lantern|lamp)`.
- `initLamp(c)` toma `c.lamp.parent` como anclaje, y `updateLamp(c,dt,t)` aplica física pendular de cadena de longitud estimada `0.28`, sin capacidad de lanzamiento extendido.
- Todavía **no se ha verificado la jerarquía interna GLB**, por lo que no se debe asumir que la cadena y la lámpara son mallas separadas o que una escala de la cadena conservará el skinning.

## Prueba de aceptación de fase 1 (pendiente)

1. Inspeccionar la jerarquía real GLB para identificar mano, cadena, lámpara y sus pivotes.
2. Prototipar separación/anclaje **solo** en un módulo aislado de `features/farolera/phase-1/`, sin modificar los modelos originales.
3. Verificar que mover la lámpara deja un extremo de la cadena anclado a la mano y que no rompe idle/ataque.
4. Pedir aprobación antes de integrar con `arena-25d.html` u otros archivos protegidos.

**Estado:** bloqueo de alcance instalado; fase 1 iniciada con inventario técnico. Sin modificaciones de geometría, clips o código de combate.
