// HumWorld - pantalla "Mapa de humor".
// Origen: HU-DASH-001-v3 (PDF, sección 4.3.2) y ADR-005. Muestra los datos de
// GET /api/v1/dashboards/map, que App.jsx pide al backend, y el gráfico de
// evolución de GET /api/v1/sentiment (HU-SENT-004). Esta pantalla no calcula humor.
// HU-DASH-004-v2: ayudas "?" junto a cada parte y escala de humor.
// HU-DASH-005 (bosquejos de la PO del 2026-11-14): el encabezado muestra el humor
// global, la leyenda de caritas y la fecha; sobre el mapa, con fondo translúcido,
// van los continentes (a un costado) y la escala del día (abajo); el gráfico de
// evolución queda debajo, fuera del mapa.
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Carita from '../componentes/Carita.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import GraficoEvolucion from '../componentes/GraficoEvolucion.jsx'
import Ayuda from '../componentes/Ayuda.jsx'
import '../componentes/GuiaVisual.css'
import { buscarContinente } from '../datos/continentes.js'
import { caritaComoTexto, formatoHumor, tipoHumor } from '../utilidades/humor.js'
import './MapaHumor.css'

// Esquinas del mapa al abrir: [abajo-izquierda, arriba-derecha] en [latitud, longitud].
const VISTA_INICIAL = [
  [-55, -150],
  [72, 170],
]

// Hasta dónde se puede mover el mapa: una sola copia del mundo.
const LIMITES_MUNDO = [
  [-85, -180],
  [85, 180],
]

// Arma el dibujo que marca un continente: una carita con el valor debajo.
// Leaflet necesita el dibujo de sus marcadores como texto HTML.
function marcadorContinente(humor) {
  return L.divIcon({
    className: 'marcador-humor',
    html: caritaComoTexto(tipoHumor(humor), 46) + `<span class="marcador-valor">${formatoHumor(humor)}</span>`,
    iconSize: [70, 72],
    iconAnchor: [35, 30],
  })
}

export default function MapaHumor({ mapa, cargando, error, alCambiarFecha }) {
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

  const hayDatos = Boolean(global && global.cantidad_noticias_evaluadas > 0)

  return (
    <section className="pantalla-mapa">
      <div className="mapa-encabezado">
        <div className="mapa-titulo">
          <h2>Mapa de humor</h2>
          <p>Humor promedio de cada continente en la fecha elegida.</p>
        </div>

        <div className="mapa-resumen">
          <div className="mapa-global">
            <span className="mapa-global-titulo">
              Humor global
              <Ayuda titulo="Humor global">
                El promedio del humor de todas las noticias del día elegido, en la escala de -10 a +10. La barra sobre
                el mapa muestra dónde cae.
              </Ayuda>
            </span>
            {hayDatos ? (
              <>
                <strong className={`mapa-global-valor texto-${tipoHumor(global.humor_promedio)}`}>
                  {formatoHumor(global.humor_promedio)}
                </strong>
                <span className="mapa-global-noticias">{global.cantidad_noticias_evaluadas} noticias</span>
              </>
            ) : (
              <strong className="mapa-global-valor">Sin datos</strong>
            )}
          </div>

          <ul className="leyenda" aria-label="Significado de las caritas">
            <li>
              <Carita tipo="negativo" tamano={22} /> Negativo
            </li>
            <li>
              <Carita tipo="neutro" tamano={22} /> Neutro
            </li>
            <li>
              <Carita tipo="positivo" tamano={22} /> Positivo
            </li>
            <li>
              <Carita tipo="sinDatos" tamano={22} /> Sin datos
            </li>
            <li>
              <Ayuda titulo="Cada carita es un continente">
                Su número es el promedio de las noticias de ese continente. Rojo y triste: negativo; amarillo: neutro
                (entre -0.5 y +0.5); verde y feliz: positivo; gris: sin noticias ese día.
              </Ayuda>
            </li>
          </ul>

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
            {/* El zoom va arriba a la derecha: a la izquierda están los continentes. */}
            <ZoomControl position="topright" />
            {continentes
              .filter((continente) => continente.ubicacion)
              .map((continente) => (
                <Marker
                  key={continente.nombre}
                  position={continente.ubicacion.centro}
                  icon={marcadorContinente(continente.humor)}
                  keyboard={false}
                >
                  <Tooltip direction="top" offset={[0, -26]}>
                    {continente.nombre}: {formatoHumor(continente.humor)}, promedio de {continente.noticias} noticias
                  </Tooltip>
                </Marker>
              ))}
          </MapContainer>
        </div>

        {continentes.length > 0 && (
          <aside className="mapa-flotante mapa-continentes" aria-labelledby="titulo-continentes">
            <h3 id="titulo-continentes">Continentes</h3>
            <ul className="continentes">
              {continentes.map((continente) => (
                <li key={continente.nombre} className="continente">
                  <Carita tipo={tipoHumor(continente.humor)} tamano={30} />
                  <span className="continente-nombre">{continente.nombre}</span>
                  <strong className={`continente-humor texto-${tipoHumor(continente.humor)}`}>
                    {formatoHumor(continente.humor)}
                  </strong>
                  <span className="continente-noticias">{continente.noticias} noticias</span>
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
