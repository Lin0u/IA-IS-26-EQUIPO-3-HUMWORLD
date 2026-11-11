// HumWorld - pantalla "Nube de palabras".
// Origen: HU-DASH-003-v2 (PDF, sección 4.3.1) y ADR-005. Muestra los datos de
// GET /api/v1/dashboards/word-cloud: términos del diccionario con más noticias
// que los contienen (HU-SENT-008). El peso lo calcula el backend; aquí solo
// define el tamaño de la letra.
// Filtros: continente o país (PDF §4.3.1). Los países salen de los canales registrados.
// HU-DASH-004: guía de lectura y detalle de una palabra al elegirla.
import { useEffect, useState } from 'react'
import { obtenerNubePalabras } from '../api/cliente.js'
import Carita from '../componentes/Carita.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import GuiaPantalla from '../componentes/GuiaPantalla.jsx'
import SelectorPais from '../componentes/SelectorPais.jsx'
import { tipoHumor } from '../utilidades/humor.js'
import '../componentes/GuiaVisual.css'
import './NubePalabras.css'

// Tamaño de letra de la palabra menos influyente y de la más influyente.
const TAMANO_MINIMO = 16
const TAMANO_MAXIMO = 50

// Los 5 continentes del enum Continente del contrato (HU-RSS-009-v2).
const CONTINENTES = ['América', 'Europa', 'Asia', 'África', 'Oceanía']

const IDIOMAS = { es: 'español', en: 'inglés' }

const PASOS_GUIA = [
  {
    titulo: 'Cada palabra viene del diccionario',
    texto: 'Son términos con un valor de humor que el sistema encontró en las noticias capturadas.',
  },
  { titulo: 'Tamaño: cuántas noticias', texto: 'Mientras más grande la palabra, en más noticias apareció.' },
  { titulo: 'Color: hacia dónde empuja', texto: 'Rojo: la palabra baja el humor. Verde: lo sube.' },
  { titulo: 'Toca una palabra', texto: 'Verás su valor exacto en la escala y en cuántas noticias aparece.' },
]

function formatoValor(valor) {
  return valor > 0 ? `+${valor}` : String(valor)
}

// Ordena alfabéticamente para que la nube no quede como una lista por tamaño.
function ordenAlfabetico(a, b) {
  return a.palabra.localeCompare(b.palabra, 'es')
}

export default function NubePalabras() {
  // Continente elegido. La cadena vacía significa "todos".
  const [continente, setContinente] = useState('')
  const [pais, setPais] = useState('')
  const [palabras, setPalabras] = useState(null)
  const [error, setError] = useState(null)
  const [elegida, setElegida] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerNubePalabras(continente, pais)
      .then((datos) => {
        if (vigente) {
          setPalabras([...datos.items].sort(ordenAlfabetico))
          setError(null)
        }
      })
      .catch((causa) => vigente && setError(causa.message))
    return () => {
      vigente = false
    }
  }, [continente, pais])

  // Cambiar de continente borra el país: podría no pertenecer al nuevo continente.
  function cambiarContinente(nuevo) {
    setPalabras(null)
    setElegida(null)
    setPais('')
    setContinente(nuevo)
  }

  function cambiarPais(nuevo) {
    setPalabras(null)
    setElegida(null)
    setPais(nuevo)
  }

  // La palabra con más peso define el tamaño máximo; las demás se escalan.
  const lista = palabras ?? []
  const pesoMaximo = Math.max(...lista.map((p) => p.peso), 1)
  const tamano = (peso) => TAMANO_MINIMO + (TAMANO_MAXIMO - TAMANO_MINIMO) * (peso / pesoMaximo)

  let contenido
  if (error) {
    contenido = (
      <p className="nube-vacia" role="alert">
        No se pudieron cargar las palabras. {error}
      </p>
    )
  } else if (palabras === null) {
    contenido = <p className="nube-vacia">Cargando palabras…</p>
  } else if (lista.length === 0) {
    contenido = <p className="nube-vacia">No hay palabras para este filtro.</p>
  } else {
    contenido = (
      // La "key" cambia con los filtros para que la animación se repita al filtrar.
      <ul className="nube" key={`${continente}-${pais}`}>
        {lista.map((item, posicion) => (
          <li
            key={item.termino_id}
            className={`palabra texto-${tipoHumor(item.valor)}`}
            style={{ fontSize: `${tamano(item.peso)}px`, animationDelay: `${posicion * 20}ms` }}
            title={`Valor ${formatoValor(item.valor)} · aparece en ${item.peso} noticias · ${IDIOMAS[item.idioma] ?? item.idioma}`}
          >
            <button
              type="button"
              className="palabra-boton"
              aria-pressed={elegida?.termino_id === item.termino_id}
              onClick={() => setElegida(elegida?.termino_id === item.termino_id ? null : item)}
            >
              {item.palabra}
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="pantalla">
      <div className="nube-encabezado">
        <div>
          <h2>Nube de palabras</h2>
          <p>Mientras más grande la palabra, en más noticias apareció.</p>
        </div>
        <div className="filtros-lugar">
          <label className="campo">
            Continente
            <select value={continente} onChange={(evento) => cambiarContinente(evento.target.value)}>
              <option value="">Todos</option>
              {CONTINENTES.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <SelectorPais continente={continente} valor={pais} onCambio={cambiarPais} />
        </div>
      </div>

      <GuiaPantalla pasos={PASOS_GUIA} />

      {contenido}

      {elegida && (
        <div className="nube-detalle" role="status">
          <p>
            <strong className={`texto-${tipoHumor(elegida.valor)}`}>{elegida.palabra}</strong> vale{' '}
            <strong>{formatoValor(elegida.valor)}</strong> en el diccionario (
            {IDIOMAS[elegida.idioma] ?? elegida.idioma}) y aparece en <strong>{elegida.peso}</strong>{' '}
            {elegida.peso === 1 ? 'noticia' : 'noticias'}.
          </p>
          <EscalaHumor valor={elegida.valor} etiqueta={elegida.palabra} />
        </div>
      )}

      <ul className="leyenda" aria-label="Significado de los colores">
        <li>
          <Carita tipo="negativo" tamano={20} /> Palabra negativa
        </li>
        <li>
          <Carita tipo="positivo" tamano={20} /> Palabra positiva
        </li>
        <li className="leyenda-nota">Toca una palabra para ver su valor</li>
      </ul>
    </section>
  )
}
