// HumWorld - geografía del globo del mapa de humor (HU-DASH-005-v3, ADR-006).
// Solo presentación: decide a qué continente pertenece el dibujo de cada país para
// pintarlo con el humor de ese continente. El humor lo calcula el backend con el
// continente del medio (ADR-002); esto no lo cambia.
import { geoCentroid, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import mundo from 'world-atlas/countries-110m.json'

// Continente de un punto [longitud, latitud] con reglas geográficas fijas. Se usa
// con el centroide de cada país; es aproximado (Rusia y Turquía quedan en un solo
// continente) y solo afecta al color del dibujo. null: Antártida.
export function continenteDePunto([longitud, latitud]) {
  if (latitud < -60) return null
  if (longitud < -25) return 'América'
  if ((longitud >= 110 && latitud <= -10) || (longitud >= 130 && latitud < 0) || longitud > 165) return 'Oceanía'
  const arabia = longitud > 34.2 && latitud > 12 && (longitud > 41 || latitud > 17)
  if (latitud < 37 && latitud > -36 && longitud >= -20 && longitud <= 52 && !arabia) return 'África'
  if (latitud >= 35 && longitud < 60) return 'Europa'
  return 'Asia'
}

// Países del mundo (Natural Earth 1:110m) con su continente para el dibujo.
export const PAISES = feature(mundo, mundo.objects.countries).features.map((pais) => ({
  ...pais,
  continente: continenteDePunto(geoCentroid(pais)),
}))

// Rotación del globo que deja al frente un punto [latitud, longitud]. La latitud
// se suaviza para no mostrar el globo desde un polo.
export function rotacionHacia([latitud, longitud]) {
  return [-longitud, -latitud * 0.6]
}

// true si el punto [latitud, longitud] queda en la cara visible del globo rotado.
export function esVisible([latitud, longitud], rotacion) {
  return geoDistance([longitud, latitud], [-rotacion[0], -rotacion[1]]) < Math.PI / 2 - 0.12
}

// Interpolación con salida suave (ease-out cúbica) entre dos rotaciones, tomando
// el camino más corto en longitud.
export function rotacionIntermedia(desde, hasta, t) {
  const avance = 1 - (1 - t) ** 3
  let delta = hasta[0] - desde[0]
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return [desde[0] + delta * avance, desde[1] + (hasta[1] - desde[1]) * avance]
}
