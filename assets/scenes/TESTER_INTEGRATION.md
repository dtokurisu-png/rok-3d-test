# R.O.K. 3D Studio — Escenarios para el tester (etapa 5)

La [Arena 2.5D](../../arena-25d.html) conserva su motor de combate y ahora admite una capa **puramente visual** de escenarios creados por el [Creador de escenarios](../../scene-editor.html).

## Probar un escenario sin publicarlo
1. En el Creador de escenarios, pulsa **Guardar JSON**.
2. Abre **Tester de juego / Arena 2.5D** y expande **Opciones**.
3. En **Escenario 3D**, pulsa **Importar escenario JSON** y selecciona el archivo descargado.
4. Usa **Decoraciones visibles** para comparar con y sin decoraciones. **Restaurar arena** regresa a la arena original.

El escenario se presenta sobre el tablero existente; la IA, el movimiento, los ataques, los HUD y las colisiones actuales **no se ven afectados por los modelos decorativos**. Esta integración no ofrece navegación alrededor de obstáculos ni colisiones con pilares o estatuas. Eso requiere una etapa de lógica de escenarios independiente.

## Escenarios publicados en GitHub

Se usa `assets/scenes/catalog.json` como índice. Actualmente está vacío: **no se ha publicado ningún escenario creado por el usuario**.

Para publicar, guardar el JSON en `assets/scenes/<slug>.json` mediante un commit autenticado de GitHub y después añadir al índice:

```json
{"name":"Templo arcano","path":"assets/scenes/templo-arcano.json"}
```

Los nombres de archivo en el índice solo aceptan letras ASCII, números, guiones y guiones bajos. No se permiten URL remotas ni rutas fuera de `assets/scenes/`. El botón **Cargar publicado** consulta el JSON del repositorio mediante GET y no solicita tokens ni escribe en GitHub.

## Compatibilidad y seguridad
- Formato: `kind: rok3d.scene`, `schemaVersion: 1`, `arena.columns: 9`, `arena.rows: 18`.
- Máximo 250 objetos y 40 capas visuales por objeto.
- Solo modelos registrados como `category: prop` y `enabledInSceneEditor: true`; los casters y las dos estatuas reservadas no pueden entrar en este catálogo general.
- La carga es transaccional: se crea primero fuera de la escena y, si algún GLB falla, el escenario actualmente visible permanece sin cambios.
- Los efectos se animan dentro del ciclo de render, sin intervenir en `updateDuel`.
- El JSON se carga solo durante la sesión del navegador; no se usa almacenamiento persistente ni credenciales del navegador.

## Verificación pendiente

Se validaron estáticamente la sintaxis del módulo independiente y del script de arena, los controles y las referencias al contrato JSON. Deben probarse aún la carga WebGL real, los FPS en dispositivos móviles y el funcionamiento del combate junto a un escenario con varios efectos.
