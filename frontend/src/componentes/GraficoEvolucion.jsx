// HumWorld - gráfico de evolución temporal del humor global.
// Origen: HU-DASH-001-v4 (gráfico temporal con eje adaptable) y ADR-005 (Chart.js). Consume
// serie_temporal de GET /api/v1/sentiment (HU-SENT-004); no calcula humor.
// HU-DASH-005 (idea de la PO del 2026-11-14): a la derecha, el planeta del logo
// pone la cara del día que está bajo el mouse, con su fecha, valor y noticias.
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js'
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { obtenerSerieGlobal } from '../api/cliente.js'
import Ayuda from './Ayuda.jsx'
import PlanetaHumor from './PlanetaHumor.jsx'
import {
  COLORES_HUMOR,
  diaDestacado,
  fechaLegible,
  formatoHumor,
  rangoEjeHumor,
  tipoHumor,
} from '../utilidades/humor.js'

const NOMBRE_TIPO = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro', sinDatos: 'Sin noticias' }

ChartJS.register(CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip)
ChartJS.defaults.font.family = "'Montserrat', system-ui, sans-serif"
ChartJS.defaults.color = '#557381'

// Días que muestra el gráfico, hacia atrás desde el último día con datos.
// Valor propuesto, a ratificar por el equipo.
const DIAS_GRAFICO = 30

// Resta días a una fecha "AAAA-MM-DD" sin pasar por la zona horaria local.
function restarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const resultado = new Date(Date.UTC(anio, mes - 1, dia - dias))
  return resultado.toISOString().slice(0, 10)
}

function rangoDelGrafico(primeraFecha, ultimaFecha) {
  if (!ultimaFecha) return null
  const desde = restarDias(ultimaFecha, DIAS_GRAFICO - 1)
  return { desde: primeraFecha && primeraFecha > desde ? primeraFecha : desde, hasta: ultimaFecha }
}

export default function GraficoEvolucion({ primeraFecha, ultimaFecha, fechaElegida }) {
  const [serie, setSerie] = useState(null)
  const [error, setError] = useState(null)
  // Índice del día bajo el mouse; null cuando el mouse está fuera del gráfico.
  const [indiceActivo, setIndiceActivo] = useState(null)
  const rango = rangoDelGrafico(primeraFecha, ultimaFecha)
  const desde = rango?.desde
  const hasta = rango?.hasta

  useEffect(() => {
    if (!desde || !hasta) return undefined
    let vigente = true
    obtenerSerieGlobal(desde, hasta)
      .then((datos) => {
        if (vigente) {
          setSerie(datos.serie_temporal ?? [])
          setError(null)
        }
      })
      .catch((causa) => vigente && setError(causa.message))
    return () => {
      vigente = false
    }
  }, [desde, hasta])

  if (!rango) return null
  if (error) {
    return (
      <p className="mapa-aviso mapa-error" role="alert">
        No se pudo cargar la evolución del humor. {error}
      </p>
    )
  }
  if (!serie) return <p className="mapa-aviso">Cargando evolución…</p>

  const datos = {
    labels: serie.map((dia) => dia.fecha),
    datasets: [
      {
        label: 'Humor global',
        data: serie.map((dia) => dia.humor_promedio),
        borderColor: '#173847',
        borderWidth: 2.5,
        tension: 0.35,
        spanGaps: true,
        // Área verde sobre el 0 y roja bajo el 0 (HU-DASH-005).
        fill: { target: 'origin', above: 'rgba(46, 196, 160, 0.16)', below: 'rgba(255, 90, 95, 0.14)' },
        pointRadius: serie.map((dia) => (dia.fecha === fechaElegida ? 7 : 4)),
        pointBackgroundColor: serie.map((dia) => COLORES_HUMOR[tipoHumor(dia.humor_promedio)]),
        pointBorderColor: '#173847',
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
      },
    ],
  }

  // HU-DASH-001-v4: el eje se adapta a los datos, incluye el 0 y cubre al menos -3..+3.
  const eje = rangoEjeHumor(serie.map((dia) => dia.humor_promedio))

  const opciones = {
    responsive: true,
    maintainAspectRatio: false,
    // Basta con acercar el mouse a la columna del día, no hace falta tocar el punto.
    interaction: { mode: 'index', intersect: false },
    onHover: (_evento, elementos) => {
      const indice = elementos.length > 0 ? elementos[0].index : null
      setIndiceActivo((actual) => (actual === indice ? actual : indice))
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
      y: {
        min: eje.min,
        max: eje.max,
        title: { display: true, text: 'Humor' },
        border: { display: false },
        // La línea del 0 se marca más fuerte que el resto.
        grid: {
          color: (contexto) => (contexto.tick.value === 0 ? 'rgba(23, 56, 71, 0.45)' : 'rgba(23, 56, 71, 0.08)'),
        },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: '#173847',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (contexto) => {
            const dia = serie[contexto.dataIndex]
            return `${formatoHumor(dia.humor_promedio)} (${dia.cantidad_noticias_evaluadas} noticias)`
          },
        },
      },
    },
  }

  const destacado = diaDestacado(serie, indiceActivo, fechaElegida)

  return (
    <div className="grafico-evolucion">
      <div className="titulo-con-ayuda">
        <h3>Evolución del humor global</h3>
        <Ayuda titulo="La línea muestra la tendencia">
          Cómo cambió el humor global día a día. Al pasar el mouse, el planeta de la derecha pone la cara de ese día.
          Para ver qué noticias pesaron más, ve a &quot;Noticias&quot;.
        </Ayuda>
      </div>
      <p>
        {serie.length === 1 ? 'Último día' : `Últimos ${serie.length} días`} con su promedio diario. Los días sin
        noticias evaluadas quedan sin punto.
      </p>
      <div className="grafico-cuerpo">
        <div className="grafico-lienzo" onMouseLeave={() => setIndiceActivo(null)}>
          <Line data={datos} options={opciones} aria-label="Gráfico de evolución del humor global" />
        </div>
        {destacado && (
          <aside className="grafico-planeta" aria-live="polite" aria-label="Humor del día destacado">
            <PlanetaHumor humor={destacado.humor_promedio} tamano={120} />
            <strong className="grafico-planeta-fecha">{fechaLegible(destacado.fecha)}</strong>
            <span className={`grafico-planeta-valor texto-${tipoHumor(destacado.humor_promedio)}`}>
              {formatoHumor(destacado.humor_promedio)}
            </span>
            <span className="grafico-planeta-tipo">
              {NOMBRE_TIPO[tipoHumor(destacado.humor_promedio)]}
              {destacado.cantidad_noticias_evaluadas > 0 && ` · ${destacado.cantidad_noticias_evaluadas} noticias`}
            </span>
            {!destacado.bajoElMouse && (
              <span className="grafico-planeta-pista">Pasa el mouse por el gráfico para ver cada día.</span>
            )}
          </aside>
        )}
      </div>
    </div>
  )
}
