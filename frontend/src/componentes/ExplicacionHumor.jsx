// HumWorld - explicación del valor de humor de una noticia: qué palabras del
// diccionario aparecen en ella y cuánto vale cada una.
// Origen: HU-DASH-002-v3 (pedido del profesor en la revisión: ver por qué una
// noticia tiene ese valor). Lee GET /api/v1/news/{id}, campo "terminos"
// (coincidencias de HU-SENT-008). Con diccionario, el humor es el promedio simple
// de esos valores (ADR-003); con ML, las palabras son solo una referencia.
import { useEffect, useState } from 'react'
import { obtenerNoticia } from '../api/cliente.js'
import { formatoHumor, tipoHumor } from '../utilidades/humor.js'

function formatoValor(valor) {
  return valor > 0 ? `+${valor}` : String(valor)
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

  return (
    <div className="explicacion">
      <ul className="explicacion-terminos" aria-label="Palabras que explican el humor">
        {terminos.map((termino) => (
          <li key={`${termino.palabra}-${termino.idioma}`} className={`termino termino-${tipoHumor(termino.valor)}`}>
            {termino.palabra} <strong>{formatoValor(termino.valor)}</strong>
          </li>
        ))}
      </ul>
      {metodo === 'ml' ? (
        <p>
          Humor calculado con el modelo de ML ({formatoHumor(valor)}). Estas son las palabras del diccionario
          encontradas, como referencia.
        </p>
      ) : (
        <p>
          Promedio de {terminos.length} {terminos.length === 1 ? 'palabra' : 'palabras'}: (
          {terminos.map((termino) => formatoValor(termino.valor)).join(' ')}) / {terminos.length} ={' '}
          <strong>{formatoHumor(valor)}</strong>
        </p>
      )}
    </div>
  )
}
