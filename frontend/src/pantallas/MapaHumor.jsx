// HumWorld - pantalla "Mapa de humor".
// Origen: HU-DASH-001-v4 (PDF, sección 4.3.2), ADR-005 y ADR-006. Muestra los datos
// de GET /api/v1/dashboards/map, que App.jsx pide al backend, y el gráfico de
// evolución de GET /api/v1/sentiment (HU-SENT-004). Esta pantalla no calcula humor.
// HU-DASH-004-v2: ayudas "?" junto a cada parte y escala de humor.
// HU-DASH-005-v3 (mundo «Globo de escritorio», decisión de la PO del 2026-11-16):
// a la izquierda el humor del mundo, al centro un globo con los continentes
// pintados por su humor y a la derecha el catálogo ordenado de más positivo a más
// negativo; al enfocar un continente el globo gira hacia él y los demás se atenúan.
import { useState } from 'react'
import Carita from '../componentes/Carita.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import Globo from '../componentes/Globo.jsx'
import GraficoEvolucion from '../componentes/GraficoEvolucion.jsx'
import Ayuda from '../componentes/Ayuda.jsx'
import '../componentes/GuiaVisual.css'
import { buscarContinente } from '../datos/continentes.js'
import { fechaLegible, formatoHumor, fraseHumorMundo, tipoHumor } from '../utilidades/humor.js'
import './MapaHumor.css'

// Del más positivo al más negativo; los continentes sin datos, al final.
function porHumor(a, b) {
  if (a.humor === null || a.humor === undefined) return 1
  if (b.humor === null || b.humor === undefined) return -1
  return b.humor - a.humor
}

export default function MapaHumor({ mapa, cargando, error, alCambiarFecha }) {
  // Continente enfocado (mouse, teclado o clic): el globo gira y los demás se atenúan.
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
  const catalogo = [...continentes].sort(porHumor)

  const hayDatos = Boolean(global && global.cantidad_noticias_evaluadas > 0)
  const tipoGlobal = hayDatos ? tipoHumor(global.humor_promedio) : 'sinDatos'
  const atenuado = (nombre) => enfocado !== null && enfocado !== nombre

  return (
    <section className="pantalla-mapa">
      <h2 className="solo-lector">Mapa de humor</h2>

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

      <div className="mapa-escena">
        {/* Lectura del día: el humor del mundo en grande. */}
        <div className="mapa-lectura" aria-label="Resumen del día" role="group">
          <span className="lectura-etiqueta">
            Humor del mundo{fecha && ` · ${fechaLegible(fecha)}`}
            <Ayuda titulo="Humor global">
              El promedio del humor de todas las noticias del día elegido, en la escala de -10 a +10. La barra de abajo
              muestra dónde cae.
            </Ayuda>
          </span>
          <strong className={`lectura-valor texto-${tipoGlobal}`}>
            {hayDatos ? formatoHumor(global.humor_promedio) : 'Sin datos'}
          </strong>
          <span className="lectura-frase">{fraseHumorMundo(hayDatos ? global.humor_promedio : null)}</span>
          <p className="lectura-nota">
            {hayDatos ? global.cantidad_noticias_evaluadas : 0} noticias evaluadas en{' '}
            {continentes.filter((c) => c.noticias > 0).length} continentes, en una escala de -10 a +10.
          </p>
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
            <Ayuda titulo="Elige un día">
              El globo, los continentes y la escala muestran el humor de las noticias de ese día.
            </Ayuda>
          </div>
        </div>

        <div className="mapa-globo">
          <Globo continentes={continentes} enfocado={enfocado} alEnfocar={setEnfocado} />
          <ul className="leyenda leyenda-mapa" aria-label="Significado de los colores">
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
              <Ayuda titulo="Cómo leer el globo" alinear="derecha">
                Cada continente se pinta con el humor promedio de sus noticias del día. Rojo: negativo; amarillo: neutro
                (entre -0.5 y +0.5); verde: positivo; gris: sin noticias ese día. Elige un continente para girar el
                globo hacia él, o arrástralo. Cada noticia cuenta en el continente del medio que la publica, no en el
                lugar donde ocurrió el hecho.
              </Ayuda>
            </li>
          </ul>
        </div>

        {catalogo.length > 0 && (
          <aside
            className="mapa-continentes"
            aria-labelledby="titulo-continentes"
            onMouseLeave={() => setEnfocado(null)}
          >
            <h3 id="titulo-continentes">Continentes</h3>
            <ul className="continentes">
              {catalogo.map((continente) => (
                <li key={continente.nombre} className={atenuado(continente.nombre) ? 'continente-atenuado' : undefined}>
                  <button
                    type="button"
                    className="continente"
                    aria-pressed={enfocado === continente.nombre}
                    onMouseEnter={() => setEnfocado(continente.nombre)}
                    onFocus={() => setEnfocado(continente.nombre)}
                    onClick={() => setEnfocado(continente.nombre)}
                  >
                    <Carita tipo={tipoHumor(continente.humor)} tamano={26} />
                    <span className="continente-nombre nombre-astro">{continente.nombre}</span>
                    <span className="continente-noticias">{continente.noticias} noticias</span>
                    <strong className={`continente-humor texto-${tipoHumor(continente.humor)}`}>
                      {formatoHumor(continente.humor)}
                    </strong>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      {hayDatos && (
        <div className="mapa-escala">
          <EscalaHumor valor={global.humor_promedio} etiqueta="Mundo" />
        </div>
      )}

      <div className="mapa-debajo">
        <GraficoEvolucion primeraFecha={primeraFecha} ultimaFecha={ultimaFecha} fechaElegida={fecha} />
      </div>
    </section>
  )
}
