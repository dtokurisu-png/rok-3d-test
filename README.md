# rok-3d-test
R.O.K. — tester existente de arena 2.5D y visor de animaciones 3D.

## Herramientas existentes
- [Arena 2.5D](./arena-25d.html): tablero, combate y **Opciones → Kasters / Animaciones** para probar los nuevos FBX sobre los casters del campo y marcar decisiones por personaje.
- [Visor de animaciones 3D](./index.html): **ahora tiene un selector desplegable** con Farolera, Arquera del Desierto, Chiara y Lioren. Conserva los controles anteriores y añade las nueve FBX nuevas con selección por personaje.

## HUD: distinción importante
Las barras de vida y controles técnicos de la arena son los del tester. **El HUD final del jugador aún no está creado en la arena 2.5D**.
El HUD inicial del Spellbook estaba en el repositorio principal `rok-lirte-html/nueva-version/frontend/`, NO en este tester. No confundir ambos.

## Recursos
- [Inventario SHA de animaciones nuevas](./assets/manifests/caster-animations.json).
- [Plan de organización](./docs/ASSET_ORGANIZATION.md).
- [Estado de desarrollo](./docs/DEVELOPMENT_STATUS.md).

Ninguna decisión de conservar/descartar borra archivos. Exporta el JSON y compártelo para fijar decisiones en GitHub. No se han migrado binarios existentes de la raíz.
