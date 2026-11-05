# Creador de Animaciones · R.O.K. 3D

## Primera versión funcional

Acceso desde la pestaña **Creador de animaciones** de R.O.K. Studio o directamente
[animation-creator.html](../animation-creator.html).

No cambia el motor de combate ni escribe en los archivos originales de personajes o FBX.
El editor reutiliza el inventario de modelos del repositorio, cargando GLB de la
categoría caster (Chiara, Lioren, Farolera y Arquera, según la biblioteca).

### Edición de poses

- **IK básica CCD**: brazo izquierdo/derecho (brazo, antebrazo, mano), pierna
  izquierda/derecha (muslo, pierna, pie), cadera/torso y torso/cabeza,
  cuando se reconocen los huesos de cada cadena.
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

## Adaptación a animaciones existentes (v0.2 · 05/11/2026)

La edición habitual comienza seleccionando un modelo: el creador intenta
aplicar el clip T-Pose ya presente en GitHub a sus huesos; si el esqueleto
no es compatible, conserva la pose original del rig. En ningún caso modifica
el GLB almacenado en el repositorio. Luego se elige **Animación de referencia**, incluyendo los
números 01–14 del ZIP original, las animaciones publicadas directamente
(15, 16, 21–23, 34–37, Standing Idle), las composiciones 24–33 ya presentes en el visor y los clips integrados en el GLB.
Las animaciones descartadas 04, 05 y 17–20 siguen identificadas en la
biblioteca histórica; seleccionar una de 01–14 no significa que vuelva
a estar aprobada para combate.

La animación se adapta al esqueleto del personaje, se muestra en la línea
de tiempo a **30 FPS** y conserva todos sus fotogramas. Se puede recorrer
cada fotograma, cambiar la posición de brazos, piernas, cadera, torso,
cabeza o muñecas con IK/XYZ y guardar su nueva pose. Mientras hay una
animación de referencia, las modificaciones se registran solo en los
fotogramas intervenidos; el resto se lee del clip original. La exportación
hornea el clip en 30 FPS y conserva las pistas de posición/escala
compatibles que procedan de la animación original.

**Crear nueva animación** pide un nombre y la agrega a una cola local
con color morado. **Reemplazar versión editada** sobrescribe la entrada
de esa animación en la cola local, en ámbar. El Gestor de Animaciones
muestra estos dos tipos separados de las animaciones originales y las
compuestas. La cola utiliza el almacenamiento local del navegador:
ni la cola ni el botón de reemplazo escriben en GitHub o borran el FBX
original. Se debe exportar el proyecto/GLB para conservar una copia
portable y posteriormente publicar la revisión verificada.

La previsualización real de las adaptaciones FBX y el GLB exportado
necesita prueba en navegador; los rigs no Mixamo pueden requerir ajustes
de correspondencia de huesos. Todavía no hay editor de curvas avanzado
ni un exportador FBX de reemplazo directo.
