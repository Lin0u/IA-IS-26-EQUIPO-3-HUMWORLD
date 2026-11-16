// HumWorld - pantalla "Mapa de humor".
// Origen: HU-DASH-001-v4 (PDF, sección 4.3.2) y ADR-005. Muestra los datos de
// GET /api/v1/dashboards/map, que App.jsx pide al backend, y el gráfico de
// evolución de GET /api/v1/sentiment (HU-SENT-004). Esta pantalla no calcula humor.
// HU-DASH-004-v2: ayudas "?" junto a cada parte y escala de humor.
// HU-DASH-005-v2 (mundo «Carta celeste», decisión de la PO del 2026-11-16): cada
// continente es un astro cuyo tamaño es su cantidad de noticias y cuyo color es su
// humor, sobre una gratícula; al enfocar un continente, los demás se atenúan.
import L from 'leaflet'
import { useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Carita from '../componentes/Carita.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import GraficoEvolucion from '../componentes/GraficoEvolucion.jsx'
import Ayuda from '../componentes/Ayuda.jsx'
import '../componentes/GuiaVisual.css'
import { buscarContinente } from '../datos/continentes.js'
import {
  caritaComoTexto,
  extremosContinentes,
  formatoHumor,
  fraseHumorMundo,
  magnitudAstro,
  tipoHumor,
} from '../utilidades/humor.js'
import './MapaHumor.css'

// Esquinas del mapa al abrir: [abajo-izquierda, arriba-derecha] en [latitud, longitud].
const VISTA_INICIAL = [
  [-66, -150],
  [72, 170],
]

// Hasta dónde se puede mover el mapa: una sola copia del mundo.
const LIMITES_MUNDO = [
  [-85, -180],
  [85, 180],
]

// Gratícula cada 30°: paralelos de -60 a +60 y meridianos de -180 a +180.
const GRATICULA = [
  ...[-60, -30, 0, 30, 60].map((latitud) => [
    [latitud, -180],
    [latitud, 180],
  ]),
  ...[-180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((longitud) => [
    [-85, longitud],
    [85, longitud],
  ]),
]
const ESTILO_GRATICULA = { color: '#9fb3c8', weight: 1, opacity: 0.55, interactive: false }

// Arma el astro de un continente: su carita al tamaño de su magnitud, con anillo,
// y el valor debajo. Leaflet necesita el dibujo de sus marcadores como texto HTML.
function marcadorContinente(humor, tamano, atenuado) {
  const ancho = Math.max(tamano + 16, 64)
  return L.divIcon({
    className: atenuado ? 'marcador-humor astro astro-atenuado' : 'marcador-humor astro',
    html:
      `<span class="astro-cuerpo" style="width:${tamano + 12}px;height:${tamano + 12}px">` +
      caritaComoTexto(tipoHumor(humor), tamano) +
      `</span><span class="marcador-valor">${formatoHumor(humor)}</span>`,
    iconSize: [ancho, tamano + 40],
    iconAnchor: [ancho / 2, (tamano + 12) / 2],
  })
}

export default function MapaHumor({ mapa, cargando, error, alCambiarFecha }) {
  // Continente enfocado (mouse o teclado): los demás se atenúan.
  const [enfocado, setEnfocado] = useState(null)
  const fecha = mapa?.fecha ?? ''
  const primeraFecha = mapa?.fecha_minima_con_datos ?? undefined
  const ultimaFecha = mapa?.fecha_maxima_con_datos ?? undefined
  const global = mapa?.global ?? null

  // Arma, para cada continente, lo que se necesita dibujar en la fecha elegida.
  const continentes = (mapa?.continentes ?? []).map((agregado) => ({
    nombre: agregado.continente,
    ubicacion: buscarContinente(agregado.continente),
    humor: agregado.humor_promedio,
    noticias: agregado.cantidad_noticias_evaluadas,
  }))
  const maximoNoticias = Math.max(0, ...continentes.map((continente) => continente.noticias ?? 0))

  const hayDatos = Boolean(global && global.cantidad_noticias_evaluadas > 0)
  const { masPositivo, masNegativo } = extremosContinentes(continentes)
  const atenuado = (nombre) => enfocado !== null && enfocado !== nombre

  return (
    <section className="pantalla-mapa">
      <div className="mapa-encabezado">
        <div className="mapa-cabeza">
          <div className="mapa-titulo">
            <h2>Mapa de humor</h2>
            <p>Humor promedio de cada continente en la fecha elegida.</p>
          </div>
          <div className="campo-con-ayuda">
            <label className="campo">
              Fecha
              <input
                type="date"
                value={fecha}
                min={primeraFecha}
                max={ultimaFecha}
                disabled={!ultimaFecha}
                onChange={(evento) => evento.target.value && alCambiarFecha(evento.target.value)}
              />
            </label>
            <Ayuda titulo="Elige un día" alinear="derecha">
              El mapa, los continentes y la escala muestran el humor de las noticias de ese día.
            </Ayuda>
          </div>
        </div>

        {/* Lecturas del día, en módulos contiguos (HU-DASH-005-v2). */}
        <ul className="mapa-kpis" aria-label="Resumen del día">
          <li className={`kpi kpi-principal kpi-${hayDatos ? tipoHumor(global.humor_promedio) : 'sinDatos'}`}>
            <span className="kpi-etiqueta">
              Humor global
              <Ayuda titulo="Humor global">
                El promedio del humor de todas las noticias del día elegido, en la escala de -10 a +10. La barra sobre
                el mapa muestra dónde cae.
              </Ayuda>
            </span>
            <strong className={`kpi-valor texto-${hayDatos ? tipoHumor(global.humor_promedio) : 'sinDatos'}`}>
              {hayDatos ? formatoHumor(global.humor_promedio) : 'Sin datos'}
            </strong>
            <span className="kpi-frase">{fraseHumorMundo(hayDatos ? global.humor_promedio : null)}</span>
            <span className="kpi-nota">escala de -10 a +10</span>
          </li>
          <li className="kpi">
            <span className="kpi-etiqueta">Noticias evaluadas</span>
            <strong className="kpi-valor">{hayDatos ? global.cantidad_noticias_evaluadas : 0}</strong>
            <span className="kpi-nota">en {continentes.filter((c) => c.noticias > 0).length} continentes</span>
          </li>
          {[
            { etiqueta: 'Más positivo', continente: masPositivo },
            { etiqueta: 'Más negativo', continente: masNegativo },
          ].map(({ etiqueta, continente }) => (
            <li key={etiqueta} className={`kpi kpi-${continente ? tipoHumor(continente.humor) : 'sinDatos'}`}>
              <span className="kpi-etiqueta">{etiqueta}</span>
              {continente ? (
                <>
                  <span className="kpi-continente">
                    <Carita tipo={tipoHumor(continente.humor)} tamano={26} />
                    <strong className="kpi-valor-chico nombre-astro">{continente.nombre}</strong>
                    <span className={`kpi-cifra texto-${tipoHumor(continente.humor)}`}>
                      {formatoHumor(continente.humor)}
                    </span>
                  </span>
                  <span className="kpi-nota">{continente.noticias} noticias</span>
                </>
              ) : (
                <strong className="kpi-valor-chico">—</strong>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mapa-avisos">
        {error && (
          <p className="mapa-aviso mapa-error" role="alert">
            No se pudieron cargar los datos del mapa. {error}
          </p>
        )}
        {cargando && !error && <p className="mapa-aviso">Cargando datos…</p>}
        {!cargando && !error && !hayDatos && (
          <p className="mapa-aviso">
            {ultimaFecha
              ? `No hay datos para esa fecha. Elige una entre ${primeraFecha} y ${ultimaFecha}.`
              : 'Todavía no hay noticias con humor calculado.'}
          </p>
        )}
      </div>

      <div className="mapa-marco">
        <div className="mapa-contenedor">
          <MapContainer
            bounds={VISTA_INICIAL}
            maxBounds={LIMITES_MUNDO}
            maxBoundsViscosity={1}
            zoomSnap={0.25}
            minZoom={1}
            maxZoom={5}
            scrollWheelZoom={false}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              noWrap
            />
            {GRATICULA.map((linea) => (
              <Polyline key={linea.flat().join(',')} positions={linea} pathOptions={ESTILO_GRATICULA} />
            ))}
            {/* El zoom va a la derecha, bajo la leyenda: a la izquierda está el catálogo. */}
            <ZoomControl position="topright" />
            {continentes
              .filter((continente) => continente.ubicacion)
              .map((continente) => (
                <Marker
                  key={continente.nombre}
                  position={continente.ubicacion.centro}
                  icon={marcadorContinente(
                    continente.humor,
                    magnitudAstro(continente.noticias, maximoNoticias),
                    atenuado(continente.nombre),
                  )}
                  keyboard={false}
                  eventHandlers={{
                    mouseover: () => setEnfocado(continente.nombre),
                    mouseout: () => setEnfocado(null),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -30]}>
                    {continente.nombre}: {formatoHumor(continente.humor)}, promedio de {continente.noticias} noticias
                  </Tooltip>
                </Marker>
              ))}
          </MapContainer>
        </div>

        <div className="mapa-flotante mapa-leyenda">
          <div className="leyenda-grupo" aria-label="Tamaño del astro">
            <span className="leyenda-titulo">Tamaño = noticias</span>
            <span className="leyenda-magnitudes" aria-hidden="true">
              {[1, Math.max(1, Math.round(maximoNoticias / 4)), Math.max(1, maximoNoticias)].map((cantidad, indice) => (
                <span key={indice} className="leyenda-magnitud">
                  <span
                    className="leyenda-disco"
                    style={{
                      width: magnitudAstro(cantidad, maximoNoticias) / 2,
                      height: magnitudAstro(cantidad, maximoNoticias) / 2,
                    }}
                  />
                  {cantidad}
                </span>
              ))}
            </span>
          </div>
          <ul className="leyenda leyenda-mapa" aria-label="Color del astro">
            <li>
              <Carita tipo="negativo" tamano={18} /> Negativo
            </li>
            <li>
              <Carita tipo="neutro" tamano={18} /> Neutro
            </li>
            <li>
              <Carita tipo="positivo" tamano={18} /> Positivo
            </li>
            <li>
              <Carita tipo="sinDatos" tamano={18} /> Sin datos
            </li>
            <li>
              <Ayuda titulo="Cada astro es un continente" alinear="derecha">
                Su tamaño es la cantidad de noticias evaluadas ese día y su número, el promedio de su humor. Rojo y
                triste: negativo; amarillo: neutro (entre -0.5 y +0.5); verde y feliz: positivo; gris: sin noticias ese
                día. Cada noticia cuenta en el continente del medio que la publica, no en el lugar donde ocurrió el
                hecho.
              </Ayuda>
            </li>
          </ul>
        </div>

        {continentes.length > 0 && (
          <aside className="mapa-flotante mapa-continentes" aria-labelledby="titulo-continentes">
            <h3 id="titulo-continentes">Catálogo de continentes</h3>
            <ul className="continentes">
              {continentes.map((continente) => (
                <li
                  key={continente.nombre}
                  className={atenuado(continente.nombre) ? 'continente continente-atenuado' : 'continente'}
                  tabIndex={0}
                  onMouseEnter={() => setEnfocado(continente.nombre)}
                  onMouseLeave={() => setEnfocado(null)}
                  onFocus={() => setEnfocado(continente.nombre)}
                  onBlur={() => setEnfocado(null)}
                >
                  <Carita tipo={tipoHumor(continente.humor)} tamano={22} />
                  <span className="continente-nombre nombre-astro">{continente.nombre}</span>
                  <span className="continente-noticias">{continente.noticias} noticias</span>
                  <strong className={`continente-humor texto-${tipoHumor(continente.humor)}`}>
                    {formatoHumor(continente.humor)}
                  </strong>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {hayDatos && (
          <div className="mapa-flotante mapa-escala">
            <EscalaHumor valor={global.humor_promedio} etiqueta="Mundo" />
          </div>
        )}
      </div>

      <div className="mapa-debajo">
        <GraficoEvolucion primeraFecha={primeraFecha} ultimaFecha={ultimaFecha} fechaElegida={fecha} />
      </div>
    </section>
  )
}
