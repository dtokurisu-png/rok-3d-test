# Pendiente — presentación de declaración de casteo (R.O.K. 3D)

Estado: **pendiente, no implementar todavía**. Solicitado el 5 de noviembre de 2026.

Cuando **cualquiera de los casters** declare un casteo, mostrar una presentación breve de estilo videojuego de peleas:
- Un panel que se despliegue desde un borde de pantalla.
- Miniatura/retrato del caster que anuncia la habilidad.
- Animación de fondo con partículas y energía acorde al elemento.
- Presentación no bloqueante: el combate y el movimiento continúan.
- El panel corresponde al inicio de la acción de casteo, no a su impacto.
- Reutilizar el HUD y el mismo evento de casteo en móvil, Aventura y otros modos.

No crear efectos, componentes visuales ni modificar el HUD hasta que se retome esta tarea.

## IA rival inicial (implementada por separado)
Archivo `caster-rival-ai.js`: objetivo prioritario absoluto recolectar orbes aun bajo fuego; luego invocar Farolera con recursos disponibles, intentando acercarse al borde del territorio del jugador y usando invocación defensiva si hay una amenaza cercana. Es una primera base temporal; faltan distribución de mazos/cartas completas y estrategias posteriores.
