# R.O.K. 3D Studio — Escenarios (etapa 4)

Abrir: [Creador de escenarios](../../scene-editor.html).

## Editor
- Usa las dimensiones de la Arena 2.5D (9 columnas × 18 filas), las baldosas y la misma ilustración de fondo y porcentajes de `arena-background.css`.
- No activa HUD, personajes ni motor de combate; la arena original no se ha modificado.
- La biblioteca solo ofrece los 12 GLB marcados como `enabledInSceneEditor`. Las dos estatuas especiales quedan reservadas para Chiara/Lioren.
- Botón de un modelo: añadir objeto. Clic sobre el modelo: seleccionar. Arrastrar: mover sobre el plano. Desde el panel: posición X/Y/Z, rotación Y y escala. Duplicar y eliminar.
- Importar asset JSON: reutiliza una composición compatible con `rok3d.asset-composition` (etapa 3), con sus capas VFX. Rechaza modelos reservados, rutas cambiadas y hashes de origen incompatibles.

## Archivo de escenario
El botón **Guardar JSON** descarga un archivo con:
```json
{
  "schemaVersion": 1,
  "kind": "rok3d.scene",
  "name": "Templo arcano",
  "arena": {"columns": 9, "rows": 18},
  "objects": []
}
```
Los objetos incluyen identificadores únicos, `modelId`, `compositionId` opcional, `effects`, `name`, `x`, `y`, `z`, `rotation` y `scale`. **Abrir JSON** verifica la estructura y las referencias antes de sustituir la escena actual.

## GitHub
El navegador no recibe tokens. La exportación es local. Para publicar definitivamente un escenario en este repositorio se requiere un commit autenticado, por ejemplo por medio de ChatGPT/GitHub conectado. El flujo no escribe archivos de usuario en `localStorage`. La etapa 5 permitirá que la arena tester lea el mismo formato una vez aprobado.

## Limitaciones
- El movimiento con arrastre funciona en el plano de la arena; `Y` se ajusta en el panel.
- Los efectos `fog` y `glow` son visualizaciones de prueba basadas en geometría/materiales, no simulaciones volumétricas.
- Verificación estática de rutas y sintaxis: realizada. Renderizado WebGL, desplazamiento táctil y carga real de GLB: pendientes de confirmar en navegador.

## Fuentes elementales vinculadas a jugadores (noviembre de 2026)

En el **Creador de escenarios**, coloca los modelos GLB o composiciones que representarán las fuentes fuera de la cuadrícula. Selecciona uno y, en **Transformación → Fuentes elementales**, pulsa **Fuente Jugador 1** o **Fuente de Jugador 2**. Solo hay una asignación por jugador (máximo dos). Se conservan geometría, efectos y posición; el nombre queda fijado automáticamente. No es posible duplicar lógicamente una fuente: una copia por espejo se convierte en decoración normal. **Quitar asignación** libera el cupo sin borrar el modelo.

El objeto exportado mantiene los campos de siempre y añade `elementSourcePlayer: 1` o `elementSourcePlayer: 2` (decoraciones normales: `null`). El botón **Guardar y exportar JSON** guarda el progreso local y descarga un JSON que conserva estas referencias. Los escenarios antiguos sin esta propiedad siguen siendo compatibles. Un JSON importado con dos fuentes asignadas al mismo jugador se rechaza.

La conexión del modelo 3D y su VFX a la **lógica real de generación de orbes de la arena** se hará tras recibir el JSON definitivo del escenario; no se presupone que un prop sin esta propiedad es una fuente. Los orbes continúan apareciendo aleatoriamente en zonas permitidas de la arena.
