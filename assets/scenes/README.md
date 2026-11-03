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
