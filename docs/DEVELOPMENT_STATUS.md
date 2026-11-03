# R.O.K. 3D Tester — Estado para continuar
Fecha de última revisión: 2026-11-03

## Estado operativo actualizado — 2026-11-03 · Arena v0.9.27

La lista vigente de trabajos activos y aplazados está guardada por separado en **[PENDIENTES_ROK_3D.md](./PENDIENTES_ROK_3D.md)**. Las listas antiguas de este documento quedan como historial, no como prioridades actuales.

**Confirmado como resuelto por el usuario:** reacción de daño de ambos casters (09), incluyendo supresión visual durante la defensa; priorización base por primer enemigo en alcance real; movilidad WASD, velocidad 3.8, ataque 1 s, alcance 3, escudo frontal y animaciones por capas.

**Etapa 5 implementada en código, pendiente prueba visual de usuario:** Arena ampliada de **9 × 18 a 15 × 30**, con 450 casillas en lugar de 162, 15 filas por jugador, posiciones de aparición en z=±14.5, casters en z=±13.5, cámara adaptada, conversión de casillas, límites de movimiento y evasión ampliados. El fondo decorativo conserva sus controles independientes de porcentaje.

**Orden siguiente:** 6) animaciones compuestas en catálogo del visor; 7) depurar ataque de un brazo y transición; 8) corregir direcciones invertidas; 9) controles de huesos bajo reproductor.

**Aplazados:** colisiones entre invocaciones, ocupación de nexos, aviso de amenaza ¡!; **modos de combate por tipo de carta se implementarán AL FINAL**, como sistema independiente.

## Lista maestra actualizada — 2026-11-03 · Arena v0.9.26

**Esta lista sustituye las listas parciales anteriores como referencia operativa.** Las secciones históricas que siguen documentan lo ocurrido en cada etapa; pueden contener estados anteriores y no deben interpretarse como el estado actual. «Implementado» significa que existe en el código; «probado por usuario» solo se utiliza cuando existe confirmación expresa. No marcar como completada una animación que no se ha visto funcionar.

### Completado / incorporado

- [x] **Controles manuales de ambos casters:** WASD mueve, **Espacio ataca** y **Shift defiende**. El combate general de las invocaciones sigue funcionando mientras se controla un caster.
- [x] **Velocidad de desplazamiento de Chiara y Lioren = 3.8** unidades/s de inicio; deslizador manual permanece configurable.
- [x] **Ciclo de ataque de los casters = 1 segundo**, manteniendo el movimiento de piernas durante la acción.
- [x] **Alcance de ataque de ambos casters = 3:** círculo de radio 3, aparición gradual desde distancia 5.5 de una invocación rival, y pequeña marca sobre la invocación que entra en rango.
- [x] **Ataque solo cuando el objetivo está en alcance al pulsar Espacio:** fuera de rango no inicia animación ni consume cooldown; dentro del rango, el objetivo queda comprometido aunque el caster se desplace durante la preparación. La actualización v0.9.25 reparó también la visibilidad del círculo estando quieto y el seguimiento del proyectil manual hasta el impacto.
- [x] **Animaciones por capas:** locomoción de cadera y piernas independiente de acciones de torso y brazos para Chiara y Lioren.
- [x] **Defensa frontal con Shift:** círculo de escudo delante del caster, animación de defensa 23 acelerada a 1.8×, sin repetición y reteniendo el último fotograma mientras se mantenga pulsado. El bloqueo de daño al 100 % sigue siendo un valor **provisional de pruebas**, no de balance final.
- [x] **Selección básica de blancos de invocaciones — v0.9.26 (probada por el usuario):** seleccionar el enemigo más cercano que **ya esté realmente dentro del alcance**, sea invocación o caster; sin enemigos a rango, avanzar hacia el caster rival sin fijar como objetivo una invocación remota; las reservas de duelo no deben atraer blancos lejanos. Durante el casteo, la selección también respeta el rango.
- [x] **Fuentes originales y lógica principal conservadas:** las transformaciones de clips se crean sobre pistas adaptadas, sin editar los FBX originales; no se reemplazó R.O.K. Lite.

### Pendientes prioritarios — hacer uno por uno

- [ ] **P1. Reacción a recibir daño de los casters (animación 09):** aunque hay una capa aditiva inicial de cabeza y cuello en el código, **el usuario reporta que todavía no se aprecia o no funciona**. Diagnosticar en los GLB reales, aplicar la reacción correcta y comprobar ambas versiones: daño normal reproduce reacción; con **Shift** activo no reproduce reacción y mantiene defensa.
- [ ] **P2. Modos de combate según tipo de carta:** nueva tarea acordada. Definir configuraciones específicas por clase de invocación o carta (movimiento, selección, estrategia, prioridades y facultades) **después** de estabilizar la prioridad base. No inventar comportamientos tácticos ni reactivar persecución a larga distancia sin diseño y aprobación.
- [ ] **P3. Colisiones físicas entre invocaciones:** evitar atravesarse y ocupar el mismo espacio; navegación y rodeo de otras unidades. Conservar efectos de animación, duelo y movimiento.
- [ ] **P4. Invocación sobre nexo ocupado:** prohibir crear una nueva invocación en un nexo físicamente ocupado por otra unidad; permitir atravesar nexos vacíos, que **no tienen collider**.
- [ ] **P5. Ampliar tablero de la Arena de 9 × 18 a 15 × 30:** actualizar dimensiones, cuadrícula, límites de desplazamiento, distribución de nexos, coordenadas, validaciones de alcance y cámara; no solo ampliar la textura decorativa.
- [ ] **P6. Animaciones compuestas en el catálogo del visor:** incluir las combinaciones reales de caminar + atacar/defender como animaciones seleccionables y ensayables **en el set de animaciones existente**, no en un editor o catálogo paralelo.
- [ ] **P7. Ajustar el ataque compuesto de caster:** evitar el movimiento de protocolo y el regreso extraño a la pose base antes/después del ataque. Probar una variante que actúe principalmente sobre **un brazo**, con inicio y recuperación adecuados, sin cancelar las piernas.
- [ ] **P8. Corregir direcciones invertidas en el visor:** avance/retroceso y desplazamientos laterales de Chiara/Lioren deben coincidir con la dirección de las animaciones y la traslación real; verificar eje por eje.
- [ ] **P9. Controles universales de ajustes de huesos bajo el reproductor del visor:** piernas y pantorrillas, hombros, brazos y antebrazos, muñecas/manos, pies, cabeza y un par de huesos del torso. Ajustes pequeños de rotación/posición, aplicables por animación sin destruir los originales, con manera explícita de conservar los valores. Los dedos individuales no son prioritarios.
- [ ] **P10. Indicador de amenaza enemiga ¡!:** cuando una invocación rival tenga a un caster dentro de su rango ofensivo, mostrar una pequeña advertencia **¡!** para facilitar la defensa. Pendiente, no confundir con la diana del ataque del propio caster.

### Reglas de desarrollo y verificación

- Cambiar y probar **una etapa o un par de parámetros estrechamente relacionados** por vez, sin tocar otras áreas del motor.
- Si una acción existe en código pero no funciona en el navegador del usuario, **permanece pendiente** hasta corregirla y comprobarla.
- Conservar controles actuales: WASD / Espacio / Shift; velocidad 3.8; ataque 1 s; alcance 3, salvo nuevas instrucciones.
- No declarar «validación WebGL» cuando solo se haya ejecutado una simulación o revisión de sintaxis.
- Actualizar los estados de esta lista maestra y después, si corresponde, el historial técnico al cerrar cada etapa.

---

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

## 2026-11-03 — Activación de las 14 animaciones anteriores para Kasters
Se corrigió `index.html` para permitir probar los clips originales 01–14 con Chiara y Lioren aun cuando no estén adaptados todavía al rig seleccionado. La precarga de los 14 FBX se inicia sin bloquear el selector de personajes; pulsar una fila solicita carga/retarget y reproducción. Se conserva el catálogo único de 23 entradas y las decisiones de las nueve animaciones nuevas. Sintaxis JS comprobada con V8; falta prueba visual de compatibilidad de los huesos en navegador.

## 2026-11-03 — Organización física completada del tester 3D
- 19 binarios reorganizados por rutas canónicas: 4 GLB de personajes, 9 GLB de props arcanos, 5 FBX conservados y 1 ZIP Mixamo.
- Se cambiaron las rutas del visor `index.html`, la arena `arena-25d.html`, el manifest del caster y el iniciador local `INICIAR_VISOR.ps1`.
- Se corrigió una duplicación de directorio al interpretar las rutas del manifiesto FBX en la arena.
- Se retiraron los 19 archivos binarios de la raíz tras verificar que sus copias canónicas tenían los mismos SHA de Git. Commit de limpieza `d49335476ad4b411cb4772ba360dffae69e59304`, respaldo `backup-before-asset-root-cleanup-2026-11-03`.
- Se incorporaron `tests/asset-integrity.test.mjs` y `.github/workflows/asset-integrity.yml`. **No se ha confirmado todavía ejecución del workflow ni QA visual/WebGL**.
- La reorganización de 175 imágenes del juego R.O.K. Lite está en `assets/images/` del repo principal como copias canónicas, pero sus antiguas rutas siguen activas para evitar romper `game.js` y el CSS.

## 2026-11-03 — Arena v0.9.26: prioridad base por alcance (implementada)

- Las invocaciones de **cualquier tipo** buscan primero un objetivo enemigo **realmente dentro de su alcance**; entre los objetivos elegibles, el más cercano tiene prioridad. El caster rival compite como objetivo de la misma manera: si está más cerca y dentro del alcance, no se ignora.
- **Sin objetivos a rango**, una invocación avanza hacia el caster rival como destino de navegación. Ya **no reserva ni persigue una invocación lejana** por el mero hecho de aparecer.
- Las reservas uno contra uno **solo se crean cuando las dos invocaciones están a alcance de combate**; el duelo establecido se mantiene mientras el rival continúa a rango. Si se separan, la reserva puede liberarse.
- Durante `casting`, la selección de objetivo también está limitada al alcance efectivo. Así el caster rival no se usa accidentalmente como blanco de un disparo desde una distancia grande.
- Se conservan lógica de proyectiles y animaciones de las invocaciones, controles del caster manual, defensa y círculo de alcance 3.
- Validación con escenarios simulados de objetivo cercano, invocación lejana, caster rival más cercano y liberación de duelo. Pendiente prueba visual en navegador WebGL.

### Próximos pendientes, sin implementar en esta fase

1. **Configuración de modos de combate según tipo de carta**: diseñar posteriormente las conductas personalizadas de las distintas clases o invocaciones, separadas de la regla base de primer enemigo en alcance. No activar persecución lejana ni tácticas complejas hasta definir esos perfiles.
2. **Animación de recibir daño en casters — 09**: revisar visiblemente ambos rigs y asegurar que se reproduzca sin cancelar locomoción; con Shift activo debe omitirse.
3. **Colisiones entre invocaciones** y navegación para rodear otras unidades.
4. **Prohibir invocar sobre un nexo físicamente ocupado**, manteniendo los nexos como suelo transitable.
5. **Arena 15 × 30** con ajuste de límites, casillas, cámara, nexos y reglas.
6. **Visor de animaciones**: composiciones visibles en catálogo, desplazamientos invertidos y edición universal por hueso.
7. **Aviso ¡! de amenaza enemiga** cuando una invocación rival tenga al caster dentro de su alcance.
