# R.O.K. 3D — Composiciones reutilizables

Etapa 3: el [Creador de assets](../../asset-editor.html) permite elegir cualquier GLB del inventario, previsualizarlo en Three.js y superponer hasta 40 capas de efectos (resplandor, luz, partículas, niebla local y pulso). La composición no cambia el GLB.

## Contrato JSON `rok3d.asset-composition` (schemaVersion: 1)

El documento contiene:
- `id` y `name` del asset compuesto.
- `source.modelId`, `source.path` y `source.gitBlobSha` del archivo GLB canónico.
- `effects`: lista de capas con `type`, `name`, `color`, `intensity`, `size`, `height`, `x`, `z` y `enabled`.

La carga comprueba versión, identidad y ruta del GLB, cantidad de capas y límites de los controles. No se incrustan modelos ni texturas en el JSON; el editor los toma de `assets/models/`. El motor del juego y el tester siguen sin cambios.

## Publicación segura en GitHub

El botón **Guardar JSON** descarga la composición al dispositivo, y **Importar JSON** vuelve a abrirla. Para publicarla en `assets/compositions/`, debe hacerse un commit autenticado a través de una integración de GitHub de confianza (por ejemplo, desde ChatGPT conectado a GitHub), no mediante tokens escritos en la página. Este repositorio no incluye un backend de autenticación ni servicio de escritura en GitHub. No presentar la descarga como una publicación remota.

Etapa 4: el creador de escenarios deberá leer este mismo contrato e instanciar las capas al cargar assets publicados. Las dos estatuas especiales están catalogadas como reservadas, no como props generales del escenario.
