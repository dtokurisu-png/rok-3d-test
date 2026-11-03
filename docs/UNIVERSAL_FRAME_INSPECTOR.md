# R.O.K. 3D — Inspector universal de fotogramas

**Etapa 2 de movilidad y animaciones compuestas · 2026-11-03**

El visor `index.html` cuenta con un panel **Fotogramas · Universal**, usando el mismo `AnimationMixer` y la animación activa del personaje actual. No genera otro modelo ni otra copia del sistema de reproducción.

## Uso

1. Seleccionar Farolera, Arquera, Chiara o Lioren en **Modelo 3D**.
2. Pulsar una animación disponible en la lista; si está descargándose o requiere retarget, esperar a que esté lista.
3. Usar la barra, botones ±1 o saltos al inicio/final. El panel muestra duración, tiempo, fotograma actual y número total a 24, 30 o 60 FPS.
4. Elegir la velocidad de la previsualización, pausar y reproducir.
5. Pulsar **Marcar inicio** y **Marcar final**. Se impide que inicio sea mayor que final.
6. **Copiar intervalo** o **Exportar intervalo JSON** para indicar qué tramo utilizar en una composición.

Al cambiar de animación, mixer o personaje, se restablecen los marcadores al rango completo del nuevo clip. Si se modifica FPS después de marcar, las marcas siguen siendo **índices de fotograma al FPS elegido** y se ajustan a los límites; por tanto, se recomienda elegir FPS *antes* de marcar segmentos.

## Exportación

Ejemplo de estructura, **no valores medidos de ningún FBX concreto**:

```json
{
  "schemaVersion": 1,
  "kind": "rok3d.animation-range",
  "character": "chiara",
  "animationId": 21,
  "sourceClip": "Standing 1H Cast Spell 01",
  "clipDurationSeconds": 1.2,
  "inspectionFPS": 30,
  "startFrame": 4,
  "endFrame": 21,
  "startTimeSeconds": 0.13333333333333333,
  "endTimeSeconds": 0.7
}
```

Estos JSON identifican **un rango de una animación**, no una composición terminada. El editor de composiciones de la siguiente etapa tomará los intervalos confirmados y añadirá orden, capas simultáneas y máscaras de huesos.

## Compatibilidad y limitaciones

- Se conservan íntegros los IDs numerados 01–23 y las exclusiones 04,05,17–20; no se modifican los FBX.
- El panel funciona también sobre el Idle original que esté activo. **El nuevo `Standing Idle.fbx` está inventariado pero sigue sin asignarse como Idle principal a Chiara y Lioren**: forma parte de la futura integración de locomoción.
- La Arquera mantiene su inspector especial de brazos en animación 10; al buscar fotogramas en el panel universal para esa animación, se llama a su función existente de muestreo.
- Los fotogramas son puntos de inspección derivados de la duración en segundos del clip, **no un recuento garantizado de keyframes internos de Mixamo**.
- No hay guardado directo en GitHub, solo copiar/descargar JSON.
- Verificación realizada: inventario/archivos, sintaxis JavaScript y referencias a controles. Validación del rig y reproducción WebGL en navegador aún pendiente.
