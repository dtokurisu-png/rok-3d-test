# R.O.K. 3D — Tester y organización de recursos

R.O.K. 3D Studio reúne cuatro pestañas: [Tester Arena 2.5D](./arena-25d.html), [Gestor de animaciones](./index.html), [Creador de assets](./asset-editor.html) y [Creador de escenarios](./scene-editor.html). El visor y la arena conservan sus motores originales.

## Estructura de recursos efectiva
```text
assets/
  models/
    casters/
      farolera/chiara_idle.glb
      arquera/ARQUERA DEL DECIERTO GLTF.glb
      chiara/chiara kaster.glb
      lioren/lioren kaster.glb
    props/
      arcane-temple/             # 14 props GLB (12 generales, 2 estatuas reservadas)
  animations/
    casters/
      farolera/ROK_PUBLICAR_ANIMACIONES.zip
      shared/                    # 6 animaciones FBX (incluye Standing Idle)
  manifests/
    asset-paths.json            # inventario y hashes de 25 activos
    caster-animations.json      # catálogo con variantes aprobadas/rechazadas
    model-library.json          # biblioteca compartida de 18 modelos GLB
```

Todos los modelos y FBX aprobados ya están en las carpetas anteriores, conservando sus nombres de origen. Las rutas del visor y de la arena, el archivo JSON de Farolera y el iniciador local PowerShell se actualizaron para usar las rutas canónicas.

**Limpieza terminada:** los 19 binarios (4 GLB de personajes, 9 props, 5 FBX y 1 ZIP) ya no están en la raíz. Se verificaron sus SHA Git en las rutas nuevas antes de eliminarlos. Hay una rama de respaldo: `backup-before-asset-root-cleanup-2026-11-03`. La carga visual WebGL todavía debe probarse en el navegador.

## Etapa 2 — Biblioteca de modelos
El inventario contiene 18 GLB: 4 casters y 14 props. Ambos editores consumen `assets/manifests/model-library.json` mediante `model-library.js`. La biblioteca del creador de assets muestra los 18; la del creador de escenarios muestra solo los 12 props generales. Las dos variantes `fantasy statue 3d model*.glb` se reservaron para Chiara y Lioren; cuál corresponde a cada uno aún no está asignado. Los editores permiten buscar, filtrar y seleccionar modelos; la previsualización/colocación 3D y el guardado corresponden a etapas posteriores. No se han movido ni modificado binarios originales.

## Etapa 3 — Creador de assets 3D
El [editor de assets](./asset-editor.html) carga los GLB del catálogo en un visor Three.js real. Permite añadir resplandor, luz puntual, partículas, niebla local y pulsos de energía, con parámetros de color, intensidad, tamaño y posición. El guardado exporta una composición JSON reutilizable; importar permite continuar la edición. [Contrato de composición y publicación segura](./assets/compositions/README.md). **La descarga JSON no publica directamente en GitHub**; se requiere un commit autenticado fuera del navegador. La integración del creador de escenarios queda para la etapa 4.

## Etapa 4 — Creador de escenarios 3D
El [Creador de escenarios](./scene-editor.html) reutiliza la geometría 9 × 18 de la Arena 2.5D y su fondo compartido sin combate ni HUD. Permite añadir los 12 props generales, colocarlos, moverlos con arrastre, rotarlos, escalarlos, duplicarlos y eliminarlos. Acepta composiciones JSON procedentes del creador de assets con efectos y exporta/importa el escenario mediante JSON. [Contrato de escenarios](./assets/scenes/README.md). **No escribe directamente en GitHub desde el navegador**. La integración con el tester es la etapa 5.

## Etapa 5 — Probar escenarios en Arena 2.5D
La [Arena 2.5D](./arena-25d.html) incluye ahora **Escenario 3D** en Opciones. Puede importar un escenario JSON creado en la etapa 4, mostrar/ocultar decoraciones, restaurar la arena original y cargar escenarios publicados listados en `assets/scenes/catalog.json`. La carga de GLB y VFX es visual e independiente del motor de combate; **los objetos no generan obstáculos ni colisiones**. El catálogo publicado empieza vacío hasta realizar commits de escenarios aprobados. [Instrucciones y limitaciones](./assets/scenes/TESTER_INTEGRATION.md).

## Animaciones de casters — Etapa 2 (Inspector universal)
El [visor de animaciones](./index.html) tiene ahora un inspector universal para el clip activo: adelantar/retroceder fotogramas, elegir muestreo 24/30/60 FPS, ajustar velocidad, marcar inicio/final y exportar intervalos JSON. **No altera los clips originales ni reemplaza el inspector especial de Arquera 10.** Consulta [instrucciones, formato y límites](./docs/UNIVERSAL_FRAME_INSPECTOR.md) y la [auditoría previa](./docs/CASTER_ANIMATION_AUDIT.md).

## WASD también en el Visor de animaciones
En [Animaciones](./index.html), selecciona **Chiara** o **Lioren**, activa **Movilidad WASD** y utiliza W (07), S (06), A (15) y D (16) o los cuatro botones táctiles del panel. La reproducción comparte el mismo `AnimationMixer`, las animaciones 06/07 del paquete original y 15/16 del catálogo existente. Al soltar las teclas utiliza `Standing Idle.fbx`. El recorrido está limitado a una zona de prueba del visor; al desactivar el control se recupera la posición inicial. Seleccionar manualmente un clip o cambiar de personaje desactiva WASD, conservando el inspector universal de fotogramas y los controles especiales de Arquera. **Pendiente:** comprobar en el navegador la reproducción real de las animaciones 15/16 sobre ambos rigs.

## Casters — Etapa 4: WASD compacto en Arena 2.5D
La [Arena 2.5D](./arena-25d.html) usa un pad compacto de **cuatro botones en la esquina inferior derecha**, selector pequeño Chiara/Lioren y velocidad. La barra de navegación que cubría toda la parte superior **se eliminó solo del tester**. El movimiento W (07), S (06), A (15), D (16) **se activa automáticamente al pulsar una tecla o mantener un botón**, sin casillas; **el resto del combate y sus animaciones continúan normalmente** durante el control manual (corrección v0.9.18). El desplazamiento comienza aunque los FBX todavía estén cargándose, usando el Idle como respaldo. Soltar vuelve a reposo. El modo manual puede terminarse usando los controles originales de pausa/repetir. [Detalles y límites](./docs/CASTER_MANUAL_MOVEMENT.md). El renderizado y retarget real aún deben probarse en navegador.

## Casters — Etapa 5: ataque manual y muerte
La [Arena 2.5D](./arena-25d.html) admite el ataque provisional con **Espacio** o el pequeño botón **✦ Ataque · Espacio** debajo del pad WASD. Usa la animación **02** cuando carga y dispara igualmente aunque el FBX esté pendiente; lanza un proyectil mágico con el motor actual hacia el caster rival (1 daño de prueba). La animación **08** se reproduce al ser derrotado si se adapta correctamente. Los controles y animaciones de las demás unidades permanecen activos. **Shift** ya realiza un **bloqueo provisional del daño mientras se mantiene pulsado**, con el FBX 23 cuando esté disponible (composición final pendiente); el casteo **21+22** sigue pendiente; la reacción de daño **09** ya está conectada como capa aditiva para ambos casters. [Alcance y limitaciones](./docs/CASTER_MANUAL_ATTACK.md).

## Casters — Etapa 6: torso, piernas y escudo frontal
En la [Arena 2.5D v0.9.22](./arena-25d.html), **Chiara y Lioren** usan ahora animaciones enmascaradas por hueso. El tren inferior continúa la marcha WASD mientras el torso ejecuta **ataque 02 (Espacio)** o **defensa 23 (Shift)**. Mantener Shift deja la defensa en el último fotograma sin bucle, a velocidad **1,8×**, y muestra una barrera circular turquesa **delante** del caster; soltar Shift oculta el escudo. Los impactos sin guardia aplican la reacción **09 aditiva de cabeza/cuello**, sin cancelar las piernas. La composición definitiva de 23 y el casteo 21+22 aún deben ajustarse junto con el usuario. [Detalles técnicos y pruebas](./docs/CASTER_LAYERED_ACTIONS.md). **La reproducción WebGL real aún requiere comprobación visual.**

## Casters — Etapa 7: velocidad, ataque y percepción de alcance
La [Arena 2.5D](./arena-25d.html) utiliza velocidad inicial **3.8**, un ataque cada **1 segundo**, y alcance efectivo **2** para Chiara y Lioren. Un anillo turquesa de radio 2 aparece gradualmente al acercarse una invocación rival (desde distancia 4.5, pleno al llegar a 2); una pequeña diana dorada marca a la invocación cuando ya está dentro del alcance. El disparo prioriza enemigos invocados dentro del alcance real y, en ausencia de ellos, al caster rival en el mismo radio; no dispara hacia objetivos lejanos. **Pendiente:** símbolo **¡!** cuando una invocación enemiga tenga al caster a tiro. [Detalles y pendientes](./docs/CASTER_LAYERED_ACTIONS.md).

## Animaciones
El catálogo mantiene los números 01–23, con los índices 04, 05, 17, 18, 19 y 20 excluidos. Solo quedan **17 disponibles**. El rechazo no renumera las animaciones para proteger referencias de código. Las antiguas 04/05 permanecen dentro del ZIP original compartido; las cuatro FBX 17–20 ya habían sido eliminadas.

## Documentación y revisión
- [Inventario canónico de recursos](./assets/manifests/asset-paths.json)
- [Reglas de organización y migración](./docs/ASSET_ORGANIZATION.md)
- [Progreso y pendientes](./docs/DEVELOPMENT_STATUS.md)
- [R.O.K. Lite](https://github.com/dtokurisu-png/rok-lirte-html) mantiene su migración de imágenes independiente.

**Validado estáticamente:** rutas nuevas presentes, SHA idénticos a los de origen al copiar, y sintaxis JavaScript del visor/arena correcta. **Pendiente:** ejecución WebGL y comprobación visual desde el navegador.

## Verificación automática
Pruebas en `tests/asset-integrity.test.mjs` y workflow `.github/workflows/asset-integrity.yml`: existencia de las 25 rutas, SHA Git, exclusión de binarios en la raíz y referencias del visor y la arena. La prueba está configurada para ejecutarse en GitHub Actions; no se ha confirmado aún una ejecución exitosa.
