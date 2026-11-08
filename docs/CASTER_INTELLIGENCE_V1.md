# R.O.K. — Inteligencia experimental de casters (v1)
**Casters:** Chiara (Agua), Lyoren (Tierra).  
**Objetivo:** evaluar opciones legales, probar alternativas aún no experimentadas y aprender de resultados observados.

## Secuencia de preparación
1. Cargar inmediatamente la memoria persistida del navegador (por caster).
2. Durante la preparación intentar cargar el archivo JSON correspondiente de `assets/ai/` cuando todavía no hay datos locales.
3. Permitir escoger **Prueba** o **Normal** por caster. Conservar esa elección localmente.
4. No habilitar el combate hasta completar la lectura, con límite de espera de cuatro segundos para no bloquear partidas sin conexión.

## Ciclo de decisión
1. Observar estado de vida, distancia al enemigo, identificación y vida de la amenaza, daño y escudos conocidos, recursos propios y del rival, unidades propias y posición.
2. Leer las tres páginas del spellbook. Filtrar por costo, capacidad, modelo cargado, territorio, espacio, objetivos y validaciones de cada efecto.
3. Crear alternativas concretas, incluyendo carta, función y, cuando corresponda, objetivo equipado. Cartas sin ejecución autónoma implementada no se ofrecen como falsas alternativas.
4. Priorizar supervivencia. Un enemigo que puede morir con un ataque debe poder eliminarse; una unidad aliada que lo bloquea proporciona una ventana para castear refuerzos o equipamiento.
5. Elegir según el modo:
   - **Prueba:** intentar primero combinaciones poco o nunca experimentadas en situaciones comparables. Puede ensayar ahorrar para otra carta si ya exploró la disponible, puede acumular el elemento necesario y no existe amenaza inmediata.
   - **Normal:** aplicar las recompensas registradas con generalización de una red pequeña; no explorar automáticamente por el solo hecho de que una opción sea nueva.
6. Ejecutar únicamente opciones válidas mediante los mecanismos originales de cast, gasto, refund y efectos.
7. No contar una invocación interrumpida como un experimento de invocación realizada.
8. Comparar resultados al cabo de cinco segundos: supervivencia, daño enemigo, número de unidades, armadura, vida máxima y capacidad elemental. Corregir valoraciones recientes tras una derrota o victoria real.

## Memoria y modelo
- Archivos de respaldo inicial: `assets/ai/chiara-experiments.json`, `assets/ai/lioren-experiments.json`.
- Claves locales: `rok.chiara.experiments.v1`, `rok.lioren.experiments.v1`.
- Cada fila contiene: **situación | carta y objetivo | función** → veces probada, puntuación, éxitos y último resultado.
- Combinaciones que no aparecen son experiencias aún no realizadas.
- El evaluador neuronal es pequeño (16 entradas, 24 unidades ocultas, 1 salida), se actualiza tras consecuencias observadas y conserva sus pesos en el JSON.
- Las memorias de aprendizaje posicional anteriores permanecen independientes.
- **No existe sincronización automática de memoria hacia GitHub:** el navegador no dispone de credenciales de escritura. Para compartir el entrenamiento entre navegadores hay que exportar el JSON e incorporarlo al repositorio.

## Casteo e interacciones implementadas
- Chiara: Farolera (1 Agua), Telépate (3 Agua), Controladora (5 Agua), siempre sujetos a validación y modelos cargados.
- Lyoren: Semillera (1 Tierra), Cariona (2 Tierra), Astarin (3 Tierra), Armadura de Roble Antiguo (4, recrafteo 2), Vigor Vital (1), Síntesis Elemental (3, máximo 3 usos).
- Ubicación: los experimentos distinguen invocaciones defensivas en retaguardia y ofensivas más próximas al frente, sin invadir por defecto territorio enemigo.
- Al recibir protección de una invocación aliada, un caster puede aprovechar esa cobertura para preparar otra carta en vez de disparar automáticamente, siempre que no tenga una eliminación inmediata disponible.

## Límites y siguiente validación
Este sistema usa una función neuronal online **más** estadísticas de experiencias, no una planificación exhaustiva ni conocimiento mágico de cartas ocultas. La recompensas de cinco segundos pueden confundir efectos simultáneos: deben verificarse contra partidas reales. No se ha demostrado aún una mejora de tasa de victoria ni se han calibrado todos los enfrentamientos. Las invocaciones sin interruptor de modo implementado no reciben un nuevo interruptor ficticio. El siguiente trabajo es validar con partidas completas, medir resultados por carta/escenario y ampliar el razonamiento a efectos de largo plazo y probabilidades de respuesta enemiga.
