---
version: 1
slug: "frontend-src-pantallas-mapahumor-jsx"
primary_target: "frontend/src/pantallas/MapaHumor.jsx"
related_targets: ["frontend/src/App.jsx"]
---

# Mapa de humor (vista principal) y marco de la app

Modo: Operate. Público: docentes que evalúan la entrega en su laptop; deben entender qué mide HumWorld y de dónde sale cada número. Tarea: leer el humor del mundo del día, ver qué continente pesa más y cuál está peor, y bajar a noticias. Restricciones: menú ☰ en todas las anchuras, escala -10 a +10, neutro ±0,5, lugar = medio, mascota planeta, 390 px funcional.

## Direction contract

THESIS: El humor del mundo como carta celeste: cada continente es un astro cuyo tamaño es su cantidad de noticias y cuyo color es su humor, sobre una gratícula que ordena la página. Rechaza el tablero SaaS de banda en degradado, vidrio difuminado y tarjetas flotantes.

OWN-WORLD: Marco azul noche plano (#0f1b33) en la barra, la banda de cada vista y el menú; trabajo sobre papel de atlas frío (#eef2f6) y blanco; tinta #14213d; filetes de 1 px (#c9d5e2 y #9fb3c8). Humor: rojo #d64545, ámbar #e0a526, verde #2e9e78 sobre una rampa de -10 a +10. Oro estelar #f2c14e solo para foco y selección. Public Sans para todo (800 en cifras, tabulares) y Spectral itálica para nombres propios (continentes, países, medios). Módulos contiguos separados por filete, esquinas de 4 a 6 px, sombras mínimas.

STORY: El docente ve la cifra del mundo con su frase, reconoce de un vistazo qué astro es más grande y de qué color es, y confirma en el catálogo los números; luego baja a Noticias y al "¿Por qué?".

FIRST VIEWPORT: Barra noche de 64 px (planeta, HumWorld, ☰). Banda noche con título, fecha y fila de 4 lecturas en módulos blancos contiguos con filete (Humor global grande con frase; Noticias evaluadas; Más positivo; Más negativo). Mapa a todo el ancho con teselas desaturadas, gratícula cada 30° y los 5 continentes como astros con anillo; catálogo de continentes a la izquierda como tabla; leyenda de magnitudes y colores arriba a la derecha; escala del día abajo. Debajo, la evolución.

FORM: Carta celeste, candidato 7 de 7 de la lista propia; seed: ea808bddb4181649. Firma: la magnitud (tamaño del astro = noticias, con leyenda de magnitudes) y el foco que atenúa los demás astros y filas al pasar o enfocar un continente.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
