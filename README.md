# rok-3d-test

R.O.K. — tester original con dos vistas: [Visor de animaciones 3D](./index.html) y [Arena 2.5D](./arena-25d.html).

## Visor original de animaciones
- Desplegable: **Farolera, Arquera del Desierto, Chiara y Lioren**.
- **Un solo catálogo numerado de 23 animaciones**: las 14 anteriores mantienen índices 01–14 y las nueve FBX subidas se añaden como 15–23, con los nombres originales, incluidas las variantes «(1)», «(2)» y «(3)».
- Las FBX nuevas se descargan automáticamente desde las rutas del repositorio al preparar el modelo. El catálogo distingue **✓ cargada y reproducible**, **☁ publicada en GitHub, por cargar**, **… descargando**, y **⚠ error de adaptación**.
- En las nueve filas nuevas se puede elegir Conservar / Descartar / Sin elegir. Esa decisión es **independiente** de la carga del archivo y se recuerda temporalmente por modelo durante la sesión. **Exportar selección JSON** permite enviarla para su registro en GitHub.
- No existe ya un panel separado de nuevas animaciones ni un módulo opcional externo de revisión.

## Arena
El tester de [arena 2.5D](./arena-25d.html) conserva su combate, los casters y las herramientas de prueba que ya existían. El **HUD definitivo de jugador sigue pendiente**: el HUD inicial de Spellbook pertenece a R.O.K. Lite, no al tester.

## Organización
- [Inventario Git y hashes de FBX](./assets/manifests/caster-animations.json)
- [Plan de recursos](./docs/ASSET_ORGANIZATION.md)
- [Estado de implementación](./docs/DEVELOPMENT_STATUS.md)

No se borraron los GLB, FBX o animaciones antiguas. **Sintaxis JS verificada; reproducción en navegador/retarget GLB necesita prueba visual.**
