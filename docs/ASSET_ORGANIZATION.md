# R.O.K. 3D — Política de recursos y limpieza segura
Fecha: 2026-11-02

## Separación de desarrollo
- Tester (`rok-3d-test`): pruebas, modelos, clips, escenarios, futuros HUD y manifest de selección.
- Juego principal (`rok-lirte-html`): importar únicamente recursos aprobados; no transferir estados de prueba.

## Carpetas objetivo
```text
assets/
  models/
    casters/<id>/
    summons/<id>/
    props/
  animations/
    casters/<id>/{idle,walk,strafe,run,attack,cast,hit,death}/
    summons/<id>/
  images/
    cards/
      casters/
      summons/
      spells/
      skins/
      backgrounds/
    ui/
      icons/
      hud/
    arenas/
      water/
  scenes/
    water/
  manifests/
    caster-animations.json
    approved-assets.json
lab/
  caster-lab.js
  caster-lab.css
docs/
  ASSET_ORGANIZATION.md
```

## Estado real
- Carpeta `assets/manifests/` e inventario FBX creados.
- `assets/models/casters/` y `assets/animations/casters/` preparadas para activos definitivos.
- Las 2 GLB y las 9 FBX recién subidas siguen **en la raíz**, porque `arena-25d.html` y el laboratorio necesitan esas rutas; **no se han movido ni borrado**.
- Sus hashes Git son distintos entre los nueve FBX; nombres semejantes NO prueban duplicados visuales.
- El selector recoge decisiones, permite copiar o exportar JSON; no guarda credenciales, no usa localStorage y no aplica cambios a GitHub por sí solo.

## Migración segura por lotes
1. Inventariar todos los usos de cada ruta (JS, CSS, HTML, mapas y manifest).
2. Identificar archivos repetidos por SHA *y* comportamiento visual en el laboratorio.
3. Obtener aprobación de conservar/retirar y guardar decisiones en un manifest versionado.
4. Añadir las rutas canónicas nuevas manteniendo copia/alias del origen.
5. Cambiar referencias por lotes pequeños; comprobar página de tester, arena, móvil, precarga y animaciones.
6. Cuando ninguna ruta refiera al origen, borrar el antiguo en un commit independiente reversible.

## Regla para R.O.K. Lite
El repo principal contiene recursos bajo `assets/` e importantes referencias a rutas antiguas desde `game.js` (archivo extenso). No mover masivamente ese árbol. Primero inventario de referencias, luego migración por grupos: `images/cards/casters`, `images/cards/summons`, `images/cards/spells`, `images/cards/skins`, `images/cards/backgrounds`, `images/ui`, `images/arenas`; verificar todas las rutas antes de retirar originales.
