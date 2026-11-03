# R.O.K. 3D — Tester y organización de recursos

El proyecto conserva sus dos páginas originales: [Visor de animaciones 3D](./index.html) y [Arena 2.5D](./arena-25d.html).

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
      arcane-temple/             # 9 modelos decorativos GLB
  animations/
    casters/
      farolera/ROK_PUBLICAR_ANIMACIONES.zip
      shared/                    # 5 animaciones FBX conservadas
  manifests/
    asset-paths.json            # inventario y hashes de 19 activos
    caster-animations.json      # catálogo con variantes aprobadas/rechazadas
```

Todos los modelos y FBX aprobados ya están en las carpetas anteriores, conservando sus nombres de origen. Las rutas del visor y de la arena, el archivo JSON de Farolera y el iniciador local PowerShell se actualizaron para usar las rutas canónicas.

**Compatibilidad:** la raíz conserva por ahora alias de los cuatro GLB de personajes, cinco FBX y ZIP Mixamo hasta que la carga se haya comprobado visualmente en todas las pantallas. Los nueve GLB decorativos se trasladaron y se retiraron de la raíz tras verificar que no estaban referidos por las páginas.

## Animaciones
El catálogo mantiene los números 01–23, con los índices 04, 05, 17, 18, 19 y 20 excluidos. Solo quedan **17 disponibles**. El rechazo no renumera las animaciones para proteger referencias de código. Las antiguas 04/05 permanecen dentro del ZIP original compartido; las cuatro FBX 17–20 ya habían sido eliminadas.

## Documentación y revisión
- [Inventario canónico de recursos](./assets/manifests/asset-paths.json)
- [Reglas de organización y migración](./docs/ASSET_ORGANIZATION.md)
- [Progreso y pendientes](./docs/DEVELOPMENT_STATUS.md)
- [R.O.K. Lite](https://github.com/dtokurisu-png/rok-lirte-html) mantiene su migración de imágenes independiente.

**Validado estáticamente:** rutas nuevas presentes, SHA idénticos a los de origen al copiar, y sintaxis JavaScript del visor/arena correcta. **Pendiente:** ejecución WebGL y comprobación visual desde el navegador.
