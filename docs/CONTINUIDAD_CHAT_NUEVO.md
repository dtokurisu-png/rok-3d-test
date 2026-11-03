# R.O.K. 3D — LISTA DE COMPROBACIÓN PARA CONTINUAR EN UN CHAT NUEVO

**Actualización:** 3 de noviembre de 2026  
**Repositorio principal:** https://github.com/dtokurisu-png/rok-3d-test  
**Rama habitual:** `main`  
**Arena 2.5D:** https://dtokurisu-png.github.io/rok-3d-test/arena-25d.html  
**Visor 3D:** https://dtokurisu-png.github.io/rok-3d-test/index.html  
**Prioridad VIGENTE:** **desarrollo del sistema de escenarios**. El visor de animaciones queda **congelado** por decisión del usuario.

> **Instrucción de continuidad:** al abrir un chat nuevo, leer este documento y `docs/PENDIENTES_ROK_3D.md` antes de realizar cambios. Revisar los archivos actuales directamente en GitHub, no suponer que las líneas o versiones de documentos históricos siguen vigentes. Avanzar una función o bloque pequeño por vez, sin rehacer lo aprobado ni cambiar sistemas no relacionados.

## Actualización posterior — Contenedor de background gótico

**Hecho después de la lista original:** existe un contenedor ambiental 3D independiente, hecho de paredes rectangulares y techo arqueado. Código nuevo en `scene-background.js`, controles en `scene-editor.html`/`scene-editor.js`, lectura de JSON en `arena-scene-overlay.js`. Dimensiones iniciales **70×140**, muros **18**, bóveda **+12** (altura máxima 30); editable el ancho en **30–120** y largo = ancho × 2. Suelo exterior al nivel de la arena, sin pisar la zona jugable 15×30. **No modifica cámaras ni combate.** La ruta exacta de la textura «panorama gótica de vitrales zafiro» no se pudo verificar; hay un campo de ruta pero no se ha aplicado la imagen de manera confirmada. La implementación necesita prueba visual en WebGL. Las **dos cámaras predeterminadas** siguen aplazadas.

## 1. Estado exacto al cerrar este chat

- [x] El usuario **decidió detener temporalmente todo trabajo de animaciones**: no modificar el visor, los ajustes de huesos, las compuestas ni la mecánica animada hasta nueva instrucción.
- [x] Se aprobó trabajar a continuación en **completar el sistema de escenarios de Arena 2.5D**.
- [x] El **Creador de animaciones con cinemática inversa (IK)** está **documentado para el futuro**, sin crear todavía botón ni editor.
- [x] Las tareas pospuestas están en `docs/PENDIENTES_ROK_3D.md`. Los detalles cronológicos están en `docs/DEVELOPMENT_STATUS.md`.
- [ ] **SIGUIENTE ACCIÓN DEL NUEVO CHAT:** escuchar qué función concreta del escenario solicita el usuario, inspeccionar el módulo de escenarios y efectuar únicamente ese ajuste. Si la petición lo permite, resolver las incompatibilidades del tamaño 15×30 indicadas más abajo.

## 2. Funciones de la ARENA ya incorporadas

- [x] Arena ampliada de **9 columnas × 18 filas a 15 columnas × 30 filas** (**450 casillas**, 15 filas por bando). Se actualizaron malla, cuadrícula, conversión `worldToCell`/`cellToWorld`, límites de evasión, movimiento de invocaciones, límites WASD, posiciones de aparición y cámara. **Código implementado; la validación visual WebGL de toda la ampliación no consta como confirmada por usuario**.
- [x] Chiara y Lioren controlables con **WASD**; velocidad inicial **3.8 unidades/s**.
- [x] **Espacio** ataca con ciclo de **1 s** y **alcance 3**. Un ataque **solo se admite si al pulsar existe objetivo a rango**. No debe ejecutarse animación ni consumirse recuperación si no hay objetivo. Si se admite, la referencia del enemigo queda fijada y el proyectil se ejecuta aunque el caster o el rival se alejen durante la animación.
- [x] Indicador circular de radio **3**, que aparece gradualmente al acercarse una invocación enemiga desde **5.5 unidades**. Marca de blanco sobre la invocación enemiga a tiro; el círculo se actualiza aunque el caster esté inmóvil.
- [x] **Shift** para defensa frontal: animación superior, piernas móviles y escudo visible únicamente mientras se defiende. Se corrigió la duplicación de escudos después de reemplazar el GLB, mediante una sola instancia por caster (`caster-animation-layers.js`). **Implementación comprobada mediante simulación; el usuario no confirmó aún de forma explícita su validación visual final**.
- [x] Capas independientes para locomoción inferior y ataque/defensa de torso y brazos; motor compartido en `caster-animation-layers.js`.
- [x] Animación **09 de reacción al recibir daño**: el usuario indicó expresamente que **ya está corregida**; no volver a intervenir sin reportes nuevos. La reacción se omite durante defensa.
- [x] **Prioridad básica de las invocaciones**, versión 0.9.26: atacar el **enemigo válido más cercano que entre realmente en su alcance**, sea caster o invocación; si no hay nadie a tiro, avanzar hacia el caster contrario, sin perseguir invocaciones lejanas. El usuario **probó el arreglo** y pidió continuar.
- [x] Conservadas reglas de duelos de invocaciones y efectos de combate existentes. No convertir «navegar hacia el caster» en permiso para dispararle fuera de alcance.
- [x] La versión nominal visible más reciente en `arena-25d.html` al documentar: **v0.9.28 · Escudo sin duplicados**. Leer GitHub antes de usar una versión nueva como referencia.

## 3. VISOR 3D: estado congelado

- [x] Interfaz independiente existente `index.html` con selector de Farolera, Arquera, Chiara y Lioren. **No crear otro visor ni un segundo catálogo**.
- [x] Catálogo histórico de **01–23** con números **04, 05, 17, 18, 19 y 20** excluidos por decisión del usuario. No renumerar ni restituir clips rechazados sin autorización.
- [x] Diez compuestas nuevas **24–33** dentro del **mismo** catálogo: **24–28 ataque violeta**, **29–33 defensa azul**. Generadas en memoria desde clips ya adaptados, sin alterar los FBX fuente.
- [x] En las compuestas de ataque se comienza desde **fotograma 13 a 30 FPS**, con transiciones suaves de aproximadamente **0.20 s**, sin añadir la animación de ataque al brazo izquierdo; ese brazo conserva su postura de locomoción/idle. Compues tas de defensa se dejaron independientes.
- [x] Visor con control de **WASD, Espacio y Shift para PREVISUALIZAR ANIMACIONES** en Chiara y Lioren: sin proyectiles, enemigos, daño ni escudo FX. Velocidad inicial 3.8; dirección de avance y asignación lateral de clips corregidas.
- [x] Reutilización de modelos/clips ya cargados y carga bajo demanda de animaciones faltantes.
- [ ] Las compuestas y orientaciones necesitan la **revisión visual de los modelos reales** cuando el usuario decida volver a las animaciones. **No es prioridad actual.**
- [x] La versión nominal observada en `index.html` al generar este documento es **v0.5.27** (puede haber cambiado respecto del historial v0.5.26). Verificar GitHub al retomar, **no modificar el visor ahora**.

## 4. SISTEMA DE ESCENARIOS: ubicación y estado actual

**Archivos principales:**

- `arena-25d.html`: arena de juego, controles para importar escenario JSON, seleccionar uno publicado, mostrar/ocultar decoraciones y restaurar arena.
- `arena-scene-overlay.js`: cargador, validador y renderizador de objetos de escenario y FX. Grupo decorativo `ROK_scenery_visual_only`, independiente de lógica de combate y hitboxes.
- `arena-scene-overlay.css`: estilos del panel de escenario.
- `assets/manifests/model-library.json`: catálogo de modelos autorizados para escenarios.
- `assets/models/props/arcane-temple/`: recursos GLB del templo arcano, con organización y manifests canónicos.
- `assets/scenes/catalog.json` y archivos publicados `assets/scenes/*.json` cuando existan/estén disponibles.

**Capacidades presentes en el código:** importación local de escenario JSON; carga desde catálogo GitHub; visibilidad de decoraciones; restaurar escenario original; instanciación de props GLB; efectos visuales decorativos (glow, light, particles, fog, pulse). Los escenarios se cargan sin tocar combatientes, tablero ni colisiones; los controles de importación **no guardan en GitHub** ni usan credenciales.

**INCOMPATIBILIDAD REAL DETECTADA PARA RESOLVER EN LA ETAPA DE ESCENARIOS:**

- [ ] `arena-scene-overlay.js`, función `normalize()`, **sigue exigiendo** `data.arena.columns === 9` y `data.arena.rows === 18` para importar escenarios, a pesar de que `arena-25d.html` usa **15×30**. Las posiciones permitidas del overlay ya se ampliaron a X=±7.5, Z=±15; el esquema JSON todavía está desactualizado. **No se corrigió durante este chat** para respetar la solicitud de solo preparar el traspaso. Revisar los JSON existentes y definir compatibilidad/migración antes de cambiar la validación.
- [ ] Inspeccionar el encuadre y proporcionalidad de los props y el fondo sobre el tablero 15×30; verificar con escenarios reales, evitando afirmaciones de validación WebGL no realizada.
- [ ] Acordar con el usuario el siguiente incremento del editor de escenarios (colocación de objetos, editor visual, guardado/versionado, etc.); no inventar funcionalidades antes de conocer su prioridad.
- [ ] Separar **objetos decorativos y FX** de cualquier futura geometría física de colisión: el overlay actual es deliberadamente visual.

**Nota:** los controles del fondo `arenaSpriteWidth` y `arenaSpriteLength` son independientes del tamaño lógico del tablero; no confundir escala decorativa con hitboxes y cuadrícula.

## 5. PENDIENTES DIFERIDOS (NO comenzar ahora)

- [ ] **Colisiones entre invocaciones**: separarse, no solaparse, rodear otras unidades.
- [ ] **No invocar sobre nexo ocupado**: el nexo vacío debe ser transitable.
- [ ] **Alerta ¡!** en caster cuando una invocación enemiga lo tiene en alcance de ataque.
- [ ] **Creador de animaciones con IK** (detalles en el archivo de pendientes): botón futuro **«Creador de animaciones»**, partir de la Pose T existente, manipulación por objetivos IK de pies/piernas, caderas, torso, cabeza, brazos y muñecas; centro de gravedad, flexión automática de rodillas, extensión de piernas, contacto de pies al suelo, límites anatómicos, línea de tiempo con keyframes, interpolación y guardado de clips nuevos. El antiguo pendiente **9 de controles de huesos** queda integrado aquí. **No programar todavía**.
- [ ] **Modos de combate según tipo de carta — ÚLTIMO**: requiere arquitectura completa configurable de IA/comportamientos para clases de carta. No introducir ahora conductas nuevas ni persecución remota.

## 6. Reglas de trabajo no negociables

1. Trabajar directamente sobre **`dtokurisu-png/rok-3d-test` en GitHub**, con commits verificables. Entregar enlace de GitHub Pages del componente intervenido. No limitarse a pegar parches cuando se dispone de acceso al repositorio.
2. **Una tarea por vez** y modificaciones quirúrgicas: no reescribir sistemas ya aprobados ni tocar componentes ajenos.
3. Diferenciar **implementado en código**, **probado por simulación/sintaxis** y **comprobado visualmente por el usuario**. No declarar terminado lo que no se ha probado realmente.
4. **Visor/animaciones congelados** mientras se trabaja el escenario. Mantener `index.html`, `viewer-caster-composites.js`, `viewer-caster-movement.js` y recursos FBX/GLB sin cambios salvo instrucción expresa.
5. Mantener la arena **15×30** y su combate actual; preservar la priorización de enemigos por alcance, el lanzamiento comprometido y la lógica del Shift.
6. Los assets viven en rutas canónicas `assets/models/`, `assets/animations/`, `assets/manifests/` y escenarios en `assets/scenes/`. **No volver a copiar grandes binarios a la raíz**, no renombrarlos sin motivo ni romper rutas.
7. Comprobar sintaxis de JS y pruebas relevantes después de cada cambio; probar la integración real cuando sea posible. Evitar guardar tokens en el navegador.
8. Documentar cada avance aquí, en `docs/PENDIENTES_ROK_3D.md` o en `docs/DEVELOPMENT_STATUS.md`, evitando que estados históricos parezcan prioridades actuales.

## 7. Primer mensaje recomendado para el chat nuevo

> Estamos continuando **R.O.K. 3D** desde el archivo `docs/CONTINUIDAD_CHAT_NUEVO.md` del repositorio `dtokurisu-png/rok-3d-test`. Lee también `docs/PENDIENTES_ROK_3D.md`. El visor de animaciones está congelado. Estamos trabajando exclusivamente en completar el **sistema de escenarios de Arena 2.5D (15×30)** sin romper el combate. Antes de editar, comprueba la incompatibilidad del cargador de escenarios que todavía valida JSON 9×18. Yo te indicaré qué componente del escenario quiero desarrollar primero. Haz cambios directamente en GitHub y verifica lo que modificas.

---

**Este documento es una fotografía del estado al 3 de noviembre de 2026.** En caso de discrepancia entre versiones de documentos y el código real, revisar los archivos más recientes del repositorio y pedir solo la decisión de producto realmente necesaria.
