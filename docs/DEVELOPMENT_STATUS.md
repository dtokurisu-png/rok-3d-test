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

## 2026-11-02 — Reimplementación aislada del visor existente (tras rollback)
- Se modificó solamente `index.html` del visor de animaciones 3D anterior, manteniendo el antiguo botón de alternar oculto como compatibilidad y agregando desplegable con Farolera, Arquera, Chiara y Lioren.
- Los modelos adicionales `chiara kaster.glb` y `lioren kaster.glb` se cargan bajo demanda antes de reemplazar al modelo visible. Si su descarga falla, se conserva el anterior.
- Se creó `lab/embedded-animation-review.js`, cargado por **import dinámico con catch**. Muestra nueve FBX del manifiesto, permite probarlas en Chiara/Lioren y seleccionar conservar/descartar/pendiente individualmente, con exportación JSON. El catálogo y la lógica original de 14 clips siguen presentes.
- Se comprobó sintaxis JS con el motor V8 antes de cada actualización del visor; el primer borrador produjo un error de sintaxis y fue descartado sin publicar. El arreglo posterior pasó la revisión de sintaxis.
- **Sin prueba real de WebGL ni del retarget en navegador** desde esta sesión; no declarar la interacción o los GLB validados hasta que el usuario los pruebe.
- La arena 2.5D no se modificó durante esta fase. El HUD definitivo sigue pendiente.

## 2026-11-03 — Catálogo unificado del visor 3D
- El visor principal `index.html` contiene **una única lista de 23 animaciones**: 01–14 originales y 15–23 FBX nuevos. No crear catálogo paralelo ni otro probador.
- Los nueve FBX nuevos fueron comprobados individualmente en GitHub por ruta y SHA: todos existen, todos tienen blob SHA distinto. No confundir variante visual semejante con copia de bytes.
- Estado explícito para cada nueva animación: «✓ GitHub» archivo existente; «… Cargando» lectura y retarget; «✓ Lista» clip listo para reproducir; «⚠ Error» problema de compatibilidad/lectura. La casilla «Elegir» es una decisión de conservar y NO una condición de disponibilidad.
- La carga de FBX nuevos se intenta automáticamente al entrar con cada modelo; el click también permite cargar/reintentar uno concreto. Las versiones 01–14 y sus ajustes especiales siguen intactos.
- Se verificó sintaxis JavaScript del visor con V8 y referencias del catálogo; pendiente prueba visual real de cada rig en navegador. Se conserva el código de arena 2.5D sin modificaciones.

## 2026-11-03 — Corrección: catálogo único de 23 animaciones
- Según la aclaración del usuario, el visor `index.html` conserva un **solo catálogo**, ampliado de 14 a 23, con las nueve nuevas FBX 15–23. Se eliminó el panel independiente para clips nuevos y su módulo JS `lab/embedded-animation-review.js`.
- Se agregaron rutas explícitas de las nueve FBX originales publicadas en raíz y carga automática por modelo, con reprocesamiento del rig al cambiar de caster. Se conserva la asignación 01–14 y el pack de Farolera original.
- Los estados de carga distinguen archivos publicados en GitHub, en descarga, listos y fallos. «Pendiente» no indica ausencia en el repo; se sustituyó la decisión de selección por «Sin elegir / Conservar / Descartar», separada del estado técnico.
- Las decisiones se guardan en memoria durante la sesión por personaje y pueden exportarse mediante **Exportar selección JSON** en la misma barra de herramientas del catálogo.
- Script pasado por comprobación de sintaxis JS antes de publicar. No hay pruebas visuales del retarget en navegador. Ningún archivo 3D se movió o borró. Arena 2.5D y R.O.K. Lite no modificados en este ajuste.

## 2026-11-03 — Corregidas las animaciones 01–14 en Chiara y Lioren
- Fallo: al cambiar de modelo, las 14 animaciones antiguas quedaban sin clips adaptados; se cargaban únicamente las nueve nuevas.
- Solución: reutilizar el ZIP `ROK_PUBLICAR_ANIMACIONES.zip` existente en GitHub, adaptar los clips antiguos independientemente a cada esqueleto y mantener las 23 animaciones en el mismo catálogo.
- En Chiara/Lioren, una fila 01–14 que aún no tenga clip permite pulsar para intentar cargarla; los errores de adaptación se muestran por entrada. Los caminos de Farolera y Arquera conservan su funcionamiento previo.
- Sintaxis de `index.html` verificada; falta prueba visual en navegador de la compatibilidad de cada clip y rig.
