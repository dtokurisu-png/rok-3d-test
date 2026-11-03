# rok-3d-test

Laboratorio de R.O.K. con **dos herramientas existentes**, sin crear un tercer escenario.

## Visor de animaciones 3D
[Abre el visor original](./index.html). Contiene un selector desplegable de **Farolera, Arquera del Desierto, Chiara y Lioren**. Conserva el catálogo Mixamo original de 14 entradas y los controles de armas/pose que correspondan. Las nueve FBX subidas recientemente se revisan en una sección adicional con opciones Conservar / Descartar / Pendiente por Kaster y exportación JSON. El módulo de revisión es opcional: un fallo al cargar clips nuevos no debe impedir el funcionamiento del visor base.

## Arena 2.5D
[Abre la arena original](./arena-25d.html). Contiene el escenario, simulación y controles de animación sobre los Kasters de la arena en Opciones. El HUD definitivo del jugador **todavía no está construido** en el tester; no confundirlo con el HUD experimental del Spellbook de R.O.K. Lite.

## Archivos y estado
- [Manifiesto con nombres y hashes de FBX](./assets/manifests/caster-animations.json)
- [Política de carpetas](./docs/ASSET_ORGANIZATION.md)
- [Estado de desarrollo](./docs/DEVELOPMENT_STATUS.md)

No se borraron ni movieron archivos GLB/FBX originales. Las decisiones del usuario requieren exportar el JSON para aplicarse de forma versionada a GitHub. Los modelos y clips necesitan comprobación visual en el navegador; los cambios del visor pasaron una revisión de sintaxis JavaScript.
