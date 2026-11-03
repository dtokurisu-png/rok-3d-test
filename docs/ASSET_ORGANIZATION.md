# R.O.K. 3D — Organización de recursos (2026-11-03)

## Carpetas canónicas, ya creadas
```text
assets/
  models/
    casters/farolera/
    casters/arquera/
    casters/chiara/
    casters/lioren/
    props/arcane-temple/
  animations/
    casters/farolera/
    casters/shared/
  manifests/
    asset-paths.json
    caster-animations.json
```

Los cuatro modelos de personaje, nueve objetos del templo, cinco FBX aprobados y ZIP original están copiados físicamente en esas rutas. Las páginas `index.html` y `arena-25d.html` consumen las rutas nuevas. `animations/farolera-pack.json` documenta el ZIP y el modelo de Farolera. El iniciador `INICIAR_VISOR.ps1` sirve `/assets/` con comprobación de directorio y extensiones permitidas.

## Reglas
1. Un modelo GLB va en `assets/models/`, no en la raíz.
2. Una animación FBX o ZIP va en `assets/animations/`; un único clip puede servir a varios personajes y entonces va en `shared/`.
3. Cada archivo posee un `gitBlobSha` registrado en `assets/manifests/asset-paths.json`; los nombres y variantes permanecen intactos hasta aprobación expresa.
4. No borrar ni renumerar clips por coincidir su nombre. El catálogo conserva IDs 01–23, bloqueando por decisión del usuario 04, 05, 17, 18, 19 y 20.
5. Nuevos props del templo deben ir en `assets/models/props/arcane-temple/`, o en una subcarpeta de escenario cuando se apruebe.
6. Las dos interfaces existentes (visor y arena) siguen siendo independientes; no crear un tercer entorno.
7. Solo eliminar una ruta antigua si se actualizaron las referencias, se comprobó el hash de destino y pasó la prueba de carga. Tras verificar hashes y referencias, los **19 recursos binarios se retiraron de la raíz**, incluyendo los de personajes y animaciones. El historial Git y la rama de respaldo permiten recuperar los originales.
8. Para el juego R.O.K. Lite, clasificar las ilustraciones de cartas, tokens, hechizos, skins, fondos, casters, invocaciones y UI en `assets/images/`; no tocar archivos en `version-anterior/`.

## Estado de verificación
- Copia exacta de 19 recursos: verificada por SHA Git y árbol.
- Los 19 archivos binarios retirados de la raíz con sus destinos confirmados.
- Referencias del visor y arena actualizadas, sintaxis JS comprobada.
- Pruebas WebGL, carga real y retarget de animaciones: **pendientes de prueba en navegador**.

## Verificación reproducible
`node --test tests/asset-integrity.test.mjs` comprueba rutas, hashes SHA y ausencia de binarios en la raíz. También se creó `.github/workflows/asset-integrity.yml` para verificarlo automáticamente en cambios futuros. Falta confirmar la ejecución del workflow y una prueba visual completa de WebGL.
