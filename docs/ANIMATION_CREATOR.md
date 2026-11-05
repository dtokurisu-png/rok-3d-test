# Creador de Animaciones · R.O.K. 3D

## Primera versión funcional

Acceso desde la pestaña **Creador de animaciones** de R.O.K. Studio o directamente
[animation-creator.html](../animation-creator.html).

No cambia el motor de combate ni escribe en los archivos originales de personajes o FBX.
El editor reutiliza el inventario de modelos del repositorio, cargando GLB de la
categoría caster (Chiara, Lioren, Farolera y Arquera, según la biblioteca).

### Edición de poses

- **IK básica CCD**: brazo izquierdo/derecho (brazo, antebrazo, mano) y pierna
  izquierda/derecha (muslo, pierna, pie), cuando se reconocen esos huesos.
  Escoge la cadena y desplaza la esfera con los ejes 3D, o introduce XYZ.
  Es una aproximación cinemática, todavía sin límites anatómicos ni pole vectors.
- **Rotación directa XYZ**: todos los huesos del rig, incluidos cadera, torso,
  cuello, cabeza y muñecas si existen. Los huesos adicionales también están
  disponibles; se guardan sus cuaterniones.
- **Restablecer pose** restaura la posición inicial del rig y sus cuatro objetivos IK.
- **Fotogramas**: 30 FPS, duración configurable; guarda poses clave pulsando
  «◆ Guardar pose clave». Los fotogramas intermedios interpolan rotaciones
  mediante slerp (cuaterniones); el modelo original permanece sin modificar.
- **Reproducción** y pausa para comprobar la secuencia.

### Guardado y exportación

- **Proyecto JSON**: conserva nombre, modelo del catálogo, duración, FPS y
  cuaterniones por hueso y fotograma. Abrirlo en el editor permite continuar.
- **GLB animado**: exporta el personaje GLB con un clip nuevo construido a
  partir de las poses clave (mínimo dos). No es una modificación del GLB
  que ya vive en GitHub; la descarga es local.
- Las animaciones creadas **no se añaden automáticamente** al catálogo del
  visor ni a la Arena; se integrarán después de verificarlas.
- El editor **no tiene guardado autenticado en GitHub**. Guardar/exportar produce
  un archivo local, sin pedir tokens de acceso.

### Límites de esta primera versión

Se requieren modelos con esqueleto. Los rigs no Mixamo pueden no proporcionar
cadenas IK reconocidas, aunque pueden editarse hueso por hueso. No se implementan
todavía límites articulares, una manipulación individual de dedos, morph targets,
curvas de interpolación complejas ni la edición destructiva de FBX existentes.
No confundir esta herramienta con el inspector del catálogo del visor.

## Comprobación manual recomendada

1. Abrir la página, seleccionar Chiara y cargar su GLB.
2. Escoger «Brazo derecho», mover el objetivo y verificar que brazo/antebrazo
   responden mientras el resto del rig permanece intacto.
3. Seleccionar «Cabeza» o «Cadera», rotar XYZ.
4. Guardar una pose en fotograma 0, adelantar la línea de tiempo, cambiar
   la pose y guardar otra.
5. Reproducir. Exportar JSON, recargar la página e importar para verificar
   que las poses se recuperan.
6. Exportar GLB e inspeccionarlo en un visor externo antes de integrarlo
   al catálogo de animaciones.
