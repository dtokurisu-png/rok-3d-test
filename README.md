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
