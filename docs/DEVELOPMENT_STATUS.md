# R.O.K. 3D Tester — Estado para continuar
Fecha: 2026-11-02

## Objetivo del usuario
Usar tester como laboratorio para aprobar casters, animaciones, HUD y escenarios antes de importarlos al juego R.O.K. Lite.

## Última implementación
- Subidos por usuario: `chiara kaster.glb`, `lioren kaster.glb` y nueve FBX; identificados por SHA.
- Nuevo laboratorio `arena-25d.html` (sección integrada) con código JavaScript interno de `arena-25d.html` y estilos estilos existentes de `arena-25d.html`; permite alternar los modelos, probar cada FBX, comparar variantes, ajustar reproducción y marcar conservar/descartar/pendiente.
- La selección se copia/exporta en JSON para su posterior aplicación al repositorio. NO se almacenan tokens, ni se borra contenido automáticamente.
- `arena-25d.html` conserva lógica, tablero y unidades, pero ahora intenta cargar modelos nuevos de Lioren (aliado) y Chiara (rival) con fallback a modelo provisional. Enlace al laboratorio en Opciones.
- Inventario en `assets/manifests/caster-animations.json`: todos los hashes diferentes; NO implica que movimientos sean visualmente diferentes.
- Directorios canónicos preparados para activos futuros. **Archivos binarios antiguos siguen en raíz** por compatibilidad; ver `docs/ASSET_ORGANIZATION.md`.

## Limitaciones y pruebas pendientes
- La carga 3D y el retarget Mixamo requieren prueba visual en navegador con ambos GLB y cada FBX; no se ejecutó prueba web interactiva en esta intervención.
- No se han aceptado ni descartado clips: decisión del usuario.
- No se ha migrado ninguna imagen del R.O.K. Lite ni eliminando archivos raíz.
- Selecciones no persisten en navegador: el JSON exportado es su respaldo versionable.
- Los clips elegidos aún no controlan el combate del tester ni el juego; son solo para audición.
- R.O.K. Lite tiene un plan independiente en `ASSET_ORGANIZATION_PLAN.md` (repo `dtokurisu-png/rok-lirte-html`).

## Próximo paso al retomar
Recibir selección JSON, verificar SHA de cada FBX, organizar variantes aprobadas, asignar roles (idle, lateral, retirada, hechizo, impacto) por caster, actualizar rutas de forma segura, probar integración en tester y solo entonces llevar a R.O.K. Lite.

## Corrección de diseño (2026-11-02)
El usuario especificó que el selector de Kasters, la audición de animaciones y las decisiones deben estar **en la arena 2.5D existente**, no en una página nueva. Se eliminó el laboratorio separado y se integraron los controles en el panel Opciones del escenario. Pendiente QA interactivo.

## Corrección de alcance, 2026-11-02
- **Dos pantallas existentes, ambas conservadas**: `index.html` (visor 3D) y `arena-25d.html` (arena).
- Se agregó un `select` de cuatro modelos al visor original, con GLB Chiara/Lioren, y una sección para ensayar las nueve FBX y exportar decisiones por modelo.
- Arena 2.5D mantiene sus controles de prueba de FBX por caster dentro de Opciones.
- **NO hay HUD de jugador definitivo en la arena 2.5D**. Lo que se había llamado HUD de Spellbook está en R.O.K. Lite (otro repositorio) y requiere backend para acciones. El HUD final del tester sigue por diseñar.
- El despliegue fue revisado estáticamente por GitHub; falta verificar GLB y clips en navegador. No declarar visualmente probado antes del usuario.

## 2026-11-02 — Reversión urgente del visor 3D
El usuario informó que el visor 3D dejó de funcionar después de convertir el botón Farolera/Arquera en desplegable y añadir el panel de nuevas FBX. Se restauró **solo `index.html`** al blob anterior conocido (`e1421014cdd0ed5cd5317f17a5990d6d37d4f6cd`) mediante commit `533105fb3393f7f29225e3fd109dec09db199848`. Se verificó el SHA restaurado.
- Los dos GLB y nueve FBX recién subidos siguen intactos, así como el tablero `arena-25d.html`.
- **El selector de Chiara/Lioren y las nuevas FBX en el visor 3D ya NO están activos.** No afirmar que siguen allí.
- Causa exacta de la regresión: pendiente de aislar y verificar; no especular sin consola/ejecución.
- Siguiente paso: comprobar con usuario la recuperación del visor original, y reimplementar por cambios pequeños con pruebas de sintaxis e interacción antes de publicar.
