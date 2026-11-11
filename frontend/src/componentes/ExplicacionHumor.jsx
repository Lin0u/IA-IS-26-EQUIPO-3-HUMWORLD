// HumWorld - explicación del valor de humor de una noticia, en 3 pasos:
// las palabras del diccionario encontradas, el cálculo y el resultado en la escala.
// Origen: HU-DASH-002-v3 y HU-DASH-004 (observaciones del profesor: ver por qué una
// noticia tiene ese valor, de forma visual). Lee GET /api/v1/news/{id}, campo
// "terminos" (coincidencias de HU-SENT-008). Con diccionario, el humor es el
// promedio simple de esos valores (ADR-003); con ML, las palabras son referencia.
import { useEffect, useState } from 'react'
import { obtenerNoticia } from '../api/cliente.js'
import { formatoHumor, tipoHumor } from '../utilidades/humor.js'
import EscalaHumor from './EscalaHumor.jsx'

function formatoValor(valor) {
  return valor > 0 ? `+${valor}` : String(valor)
}

// Un sumando dentro de la fórmula: los negativos van entre paréntesis.
function sumando(valor) {
  return valor < 0 ? `(${valor})` : String(valor)
}

export default function ExplicacionHumor({ noticiaId }) {
  const [detalle, setDetalle] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerNoticia(noticiaId)
      .then((datos) => vigente && setDetalle(datos))
      .catch((causa) => vigente && setError(causa.message))
    return () => {
      vigente = false
    }
  }, [noticiaId])

  if (error) {
    return (
      <p className="explicacion" role="alert">
        No se pudo cargar la explicación. {error}
      </p>
    )
  }
  if (!detalle) return <p className="explicacion">Cargando explicación…</p>

  const { terminos, valor_humor: valor, metodo_calculo: metodo } = detalle
  if (terminos.length === 0) {
    return <p className="explicacion">No se encontraron palabras del diccionario en esta noticia.</p>
  }

  const suma = terminos.reduce((total, termino) => total + termino.valor, 0)
  const cantidad = terminos.length

  return (
    <ol className="explicacion" aria-label="Por qué la noticia tiene este humor">
      <li className="explicacion-paso">
        <span className="explicacion-titulo">
          Palabras del diccionario encontradas en el título y el resumen ({cantidad})
        </span>
        <ul className="explicacion-terminos" aria-label="Palabras que explican el humor">
          {terminos.map((termino) => (
            <li key={`${termino.palabra}-${termino.idioma}`} className={`termino termino-${tipoHumor(termino.valor)}`}>
              {termino.palabra} <strong>{formatoValor(termino.valor)}</strong>
            </li>
          ))}
        </ul>
        <span className="explicacion-nota">
          Cada palabra tiene un valor fijo en el diccionario y cuenta una sola vez.
        </span>
      </li>

      {metodo === 'ml' ? (
        <li className="explicacion-paso">
          <span className="explicacion-titulo">Cálculo con el modelo de ML</span>
          <span>
            Este humor lo calculó el modelo de aprendizaje automático, que lee el texto completo. No es el promedio de
            estas palabras: se muestran como referencia.
          </span>
        </li>
      ) : (
        <li className="explicacion-paso">
          <span className="explicacion-titulo">Cálculo: promedio de los valores</span>
          <span className="explicacion-formula">
            Suma: {terminos.map((termino) => sumando(termino.valor)).join(' + ')} = {suma}
          </span>
          <span className="explicacion-formula">
            Promedio: {suma} ÷ {cantidad} {cantidad === 1 ? 'palabra' : 'palabras'} ={' '}
            <strong>{formatoHumor(valor)}</strong>
          </span>
        </li>
      )}

      <li className="explicacion-paso">
        <span className="explicacion-titulo">Resultado en la escala</span>
        <EscalaHumor valor={valor} etiqueta="Esta noticia" />
      </li>
    </ol>
  )
}
