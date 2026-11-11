// HumWorld - barra de la escala de humor, de -10 (muy negativo) a +10 (muy
// positivo), con una marca opcional en un valor.
// Origen: HU-DASH-004. Da contexto a cada número de humor: dónde cae dentro de la
// escala del diccionario (PDF §10.4; ADR-003).
import { formatoHumor, posicionEnEscala, tipoHumor } from '../utilidades/humor.js'

const MARCAS = [-10, -5, 0, 5, 10]

export default function EscalaHumor({ valor = null, etiqueta = 'Resultado' }) {
  const conValor = valor !== null && valor !== undefined
  const descripcion = conValor
    ? `Escala de humor de -10 a +10. ${etiqueta}: ${formatoHumor(valor)}`
    : 'Escala de humor de -10 a +10'

  return (
    <div className="escala" role="img" aria-label={descripcion}>
      <div className="escala-barra">
        {conValor && (
          <span
            className={`escala-marca escala-marca-${tipoHumor(valor)}`}
            style={{ left: `${posicionEnEscala(valor)}%` }}
          >
            {etiqueta} {formatoHumor(valor)}
          </span>
        )}
      </div>
      <div className="escala-numeros" aria-hidden="true">
        {MARCAS.map((marca) => (
          <span key={marca}>{marca > 0 ? `+${marca}` : marca}</span>
        ))}
      </div>
      <div className="escala-textos" aria-hidden="true">
        <span>Muy negativo</span>
        <span>Neutro</span>
        <span>Muy positivo</span>
      </div>
    </div>
  )
}
