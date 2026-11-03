# R.O.K. 3D — Auditoría de movilidad y composiciones de casters
Fecha: 2026-11-03 · Etapa 1 de animaciones compuestas

## Alcance

Inspección **estática** del repositorio y sus rutas/identificadores. No se han alterado el motor, los FBX, el visor, las máscaras ni el comportamiento del tester. Los clips binarios constan en el árbol Git por nombre, tamaño y SHA; la reproducción y compatibilidad del retarget sobre los GLB de Chiara y Lioren siguen **sin validar visualmente en WebGL**.

## Mapeo confirmado por el usuario y el catálogo del visor

| Acción / tecla | ID | Nombre REAL del FBX / origen | Estado de integración |
|---|---:|---|---|
| Ataque a distancia | 02 | `Magic Heal.fbx` (ZIP Farolera) | Existe en catálogo, se usa en invocaciones; todavía no es ataque manual del caster |
| Retroceder / S | 06 | `Running Backward.fbx` (ZIP) | En catálogo; no vinculado a WASD |
| Avanzar / W | 07 | `Running.fbx` (ZIP) | En catálogo; no vinculado a WASD |
| Morir | 08 | `Sword And Shield Death.fbx` (ZIP) | Se usa en invocaciones, no se ha configurado en caster |
| Reacción a daño | 09 | `Standing React Small From Headshot.fbx` (ZIP) | Existe una composición aditiva con máscara en las invocaciones, NO todavía en casters |
| Izquierda / A | 15 | `Right Strafe.fbx` (shared) | Existe archivo y fila; dirección efectiva sin comprobar |
| Derecha / D | 16 | `Right Strafe (1).fbx` (shared) | Existe archivo y fila; dirección efectiva sin comprobar |
| Castear (fuente A) | 21 | `Standing 1H Cast Spell 01.fbx` (shared) | En catálogo, composición pendiente de recortes/orden/máscaras |
| Castear (fuente B) | 22 | `Standing 2H Magic Area Attack 02 (1).fbx` (shared) | En catálogo, composición pendiente |
| Defender / Espacio | 23 | `Sword And Shield Impact.fbx` (shared) | En catálogo; requiere composición específica, **no** equivaler automáticamente a escudo funcional |
| Idle de caster | SIN ID NUMERADO TODAVÍA | `Standing Idle.fbx` (shared) | Archivo registrado en manifiestos, NO añadido al array `animCatalog` de `index.html` ni asignado a casters |

Los IDs 04, 05, 17, 18, 19 y 20 permanecen rechazados/ocultos. **No renumerar 15–23**. No llamar al Idle nuevo «24» sin aprobación: es una fuente separada que puede ser una acción de reposo sin número.

Los IDs 15 y 16 tienen ambos nombres basados en *Right Strafe* pero **SHA distintos**. El nombre no demuestra su movimiento real izquierda/derecha: validar postura, dirección y root motion sobre ambos rig.

## Dónde vive cada sistema

- `index.html`, líneas ~265–297: lista numerada de 23 entradas; 01–14 ZIP + 15–23 shared. Las 21/22/23 ya están en la lista original.
- `index.html`, líneas ~1641–1679: cargador/retarget de nuevos FBX. `Standing Idle.fbx` no figura entre las nueve entradas `newAnimationPaths`: no se precarga en ese flujo.
- `index.html`, líneas ~68–120, ~862–1128: inspector de fotogramas y brazos exclusivo de Arquera/ataque 10. Se debe extraer una **línea temporal universal** sin alterar su perfil persistente.
- `arena-25d.html`, líneas ~379–395 y ~949–989: los clips de combate se precargan para invocaciones; la selección incluye 02, 08, 09, 12, 13, 14 (más 10 para Arquera). No existe mapeo WASD/casteo/defensa para los casters.
- `arena-25d.html`, líneas ~1220–1250: creación de caster como entidad inmóvil.
- `arena-25d.html`, líneas ~2975–3004: Chiara/Lioren sustituyen al modelo provisional; su Idle activo se elige del GLB por nombre `idle|standing`, luego primer clip, luego clip vacío. **No** se usa `Standing Idle.fbx`.
- `arena-25d.html`, líneas ~3017–3121: probador de clips del manifiesto shared en casters reales; pausa combate mientras reproduce y exporta decisiones. No es un sistema de locomoción.

## Composición real de daño (reutilizar, no duplicar)

La lógica fuente está en `arena-25d.html`, líneas ~2054–2144:

- `HIT_OVERLAY_BONES` para marcha/reposo: **neck, head, leftupleg, rightupleg**.
- `ATTACK_HIT_OVERLAY_BONES` mientras `stage === 'casting'`: **neck, head** solamente.
- Solo selecciona pistas `*.quaternion` de esos huesos, clona sus tracks, crea un `AnimationClip` derivado, usa `THREE.AnimationUtils.makeClipAdditive(clip, 0, clip, 30)`, `THREE.AdditiveAnimationBlendMode` y peso **0.85**.
- No reemplaza el mixer/clip principal ni reinicia el ataque; el overlay termina sin forzar el Idle.
- Brazos, manos, dedos y el tronco están protegidos del overlay. Fuera de ataque tampoco interviene directamente en rodillas, pantorrillas o pies.
- **Limitación:** `getHitOverlayClip(c)` depende de `getCombatClip(c,9)`, cuyos mapas están preparados para invocaciones. La existencia de esta lógica **no significa** que las dos instancias caster reciban ya el overlay. El mismo algoritmo deberá parametrizarse con clips retargeteados para cada caster y situaciones de movimiento/defensa.

## Decisiones técnicas antes de la implementación

1. Definir estados de caster `idle / forward / backward / strafe-left / strafe-right / ranged-attack / casting / defending / hit / dying`, priorizando muerte, defensa y acciones no interrumpibles sin mezclar aleatoriamente los clips.
2. Conectar `Standing Idle.fbx` como fuente de reposo de Chiara y Lioren, mediante retarget seguro y fallback explícito al Idle del GLB si falla (no renumerar).
3. Construir línea temporal universal con fotogramas reales o muestreo a FPS elegido, selección de rangos y previsualización no destructiva.
4. Composiciones con máscara de huesos, secuencias o capas simultáneas; guardar receta JSON con IDs de origen, intervalos, FPS, prioridad y huesos; clips fuente sin editar.
5. Casteo 21+22: **falta especificación del usuario** sobre fotogramas, orden y simultaneidad.
6. Defensa de 23: **falta especificación del usuario** sobre qué intervalos, huesos y duración del bloqueo; la defensa mecánica (mitigación/ventana) es decisión posterior, independiente del clip.
7. Definir movimiento local/absoluto de WASD, colisiones con límites y direcciones reales de clips 15/16. No tocar IA/combate mientras el control manual esté en pruebas.
8. Verificar tiempos, tracks y retarget real de cada FBX en el navegador con Chiara y Lioren; el árbol Git solo confirma existencia de archivos, no que reproduzcan correctamente.

## Resultado

Auditoría concluida en cuanto a **código, inventario y riesgos**. No se declara validación de contenido de FBX ni prueba WebGL. Próximo paso: etapa 2, inspector universal por fotogramas para cualquier animación activa, conservando el inspector especial de Arquera.
