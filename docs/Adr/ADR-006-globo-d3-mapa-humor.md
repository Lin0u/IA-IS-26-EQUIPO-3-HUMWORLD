# ADR-006: Globo con D3 (d3-geo) para el mapa de humor

- Estado: Propuesto
- Fecha: 2026-11-16
- Responsables: Equipo 3 (PO y frontend)
- Relacionado con: ADR-005 (sección 4, Mapas), HU-DASH-001-v4, HU-DASH-005-v3, PDF §4.3 y §6.2

## Contexto

ADR-005 eligió Leaflet con teselas de OpenStreetMap para el mapa de humor. En la revisión de diseño del 2026-11-16 la PO eligió el mundo visual «Globo de escritorio» (HU-DASH-005-v3): el mundo se muestra como un globo terráqueo iluminado cuyos continentes se pintan con su humor. Leaflet solo dibuja mapas planos con teselas y no permite colorear los países por continente sin una capa vectorial propia. El PDF (§4.3 y §6.2) sugiere tanto Leaflet como D3.js para mapas y gráficos interactivos.

## Decisión

En la vista "Mapa de humor" se reemplaza el mapa de Leaflet por un globo SVG dibujado con `d3-geo` (proyección ortográfica), con los contornos de países de `world-atlas` (Natural Earth 1:110m, TopoJSON) leídos con `topojson-client`. Cada país se colorea con el humor del continente al que pertenece; el continente de cada país se obtiene del centroide del país con reglas geográficas fijas (`utilidades/globo.js`, con pruebas). El globo gira suavemente hacia el continente que se enfoca y se puede arrastrar. Los datos cartográficos van en el paquete: no se piden teselas a ningún servidor externo.

## Alternativas consideradas

1. **Mantener Leaflet y colorear con GeoJSON.** Conserva ADR-005, pero el resultado sigue siendo un mapa plano y no cumple la dirección visual elegida.
2. **Globo de D3 sobre el mapa de Leaflet (los dos).** Repite la misma información en dos piezas y suma peso a la vista.
3. **Globo con WebGL (three.js o globe.gl).** Más vistoso, pero mucho más pesado, sin necesidad de 3D real y con peor accesibilidad y pruebas.

## Consecuencias

### Positivas
- La vista principal muestra el humor sobre los contornos reales de los continentes.
- Sin dependencia de un servidor de teselas: funciona sin conexión a OpenStreetMap y sin errores de teselas en la consola.
- Proyección y clasificación por continente probadas sin navegador (Vitest).

### Negativas y deuda aceptada
- Tres dependencias nuevas (`d3-geo`, `topojson-client`, `world-atlas`, cerca de 110 KB de datos).
- El globo muestra un hemisferio a la vez: los continentes del otro lado se indican en el borde del globo y en el catálogo de continentes, que siempre lista los 5.
- La clasificación de países por continente es aproximada (centroide): por ejemplo, Rusia y Turquía quedan en un solo continente. Solo afecta al color del dibujo; el humor de cada continente lo sigue calculando el backend con el continente del medio (ADR-002).
- Leaflet y `react-leaflet` dejan de usarse en el mapa; se mantienen instalados hasta decidir si se retiran.

## Historias de usuario relacionadas

HU-DASH-001-v4 (mapa y evolución), HU-DASH-005-v3 (mundo visual «Globo de escritorio»).

## Tabla de control de versiones

| Versión | Fecha | Motivo del cambio |
|---|---|---|
| v1.0 | 2026-11-16 | Creación. Decisión de la PO del 2026-11-16 (globo con D3 en lugar del mapa de Leaflet). |
