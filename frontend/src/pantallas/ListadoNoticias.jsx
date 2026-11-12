// HumWorld - pantalla "Listado de noticias".
// Origen: HU-DASH-002-v2 (PDF, sección 4.3.2: "lista de las noticias que más han
// influido en el cálculo del humor") y ADR-005. Muestra GET /api/v1/news con
// orden=influencia: el backend ordena por |valor_humor|, filtra y pagina.
// HU-DASH-002-v3: cada noticia puede mostrar las palabras que explican su valor.
// HU-DASH-004-v2: ayuda "?" junto al título, con la escala de humor.
import { useEffect, useState } from 'react'
import { obtenerNoticias } from '../api/cliente.js'
import Carita from '../componentes/Carita.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import ExplicacionHumor from '../componentes/ExplicacionHumor.jsx'
import Ayuda from '../componentes/Ayuda.jsx'
import AyudaPasos from '../componentes/AyudaPasos.jsx'
import SelectorPais from '../componentes/SelectorPais.jsx'
import '../componentes/GuiaVisual.css'
import { formatoHumor, tipoHumor } from '../utilidades/humor.js'
import { nombreCategoria } from '../utilidades/iptc.js'
import './ListadoNoticias.css'

const FILTROS = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'positivas', nombre: 'Positivas' },
  { id: 'negativas', nombre: 'Negativas' },
]

const CONTINENTES = ['América', 'Europa', 'Asia', 'África', 'Oceanía']
const TAMANIO_PAGINA = 10

const NOMBRE_TIPO = { positivo: 'positiva', negativo: 'negativa', neutro: 'neutra', sinDatos: 'sin datos' }

const PASOS_AYUDA = [
  {
    titulo: 'Cada tarjeta es una noticia',
    texto: 'El número de la izquierda es su humor, de -10 (muy negativa) a +10 (muy positiva).',
  },
  {
    titulo: 'Primero, las que más pesaron',
    texto: 'Se ordenan por influencia: mientras más lejos de 0 está su humor, más arriba aparece.',
  },
  {
    titulo: 'Mira por qué tiene ese número',
    texto: 'El botón amarillo muestra qué palabras del diccionario encontró el sistema y cómo calculó el promedio.',
  },
]

// Convierte la fecha técnica (2026-10-02T09:15:00) en una fecha legible.
function formatoFecha(fechaIso) {
  if (!fechaIso) return null
  return new Date(fechaIso).toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function ListadoNoticias() {
  const [filtro, setFiltro] = useState('todas')
  const [continente, setContinente] = useState('')
  const [pais, setPais] = useState('')
  const [pagina, setPagina] = useState(1)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState(null)
  const [explicada, setExplicada] = useState(null)

  useEffect(() => {
    let vigente = true
    obtenerNoticias({ signo: filtro, continente, pais, pagina, tamanioPagina: TAMANIO_PAGINA })
      .then((datos) => {
        if (vigente) {
          setResultado(datos)
          setError(null)
        }
      })
      .catch((causa) => vigente && setError(causa.message))
    return () => {
      vigente = false
    }
  }, [filtro, continente, pais, pagina])

  // Cambiar un filtro vuelve a la primera página.
  function cambiarFiltro(nuevo) {
    setResultado(null)
    setPagina(1)
    setFiltro(nuevo)
  }

  // Cambiar de continente borra el país: podría no pertenecer al nuevo continente.
  function cambiarContinente(nuevo) {
    setResultado(null)
    setPagina(1)
    setPais('')
    setContinente(nuevo)
  }

  function cambiarPais(nuevo) {
    setResultado(null)
    setPagina(1)
    setPais(nuevo)
  }

  function irAPagina(nueva) {
    setResultado(null)
    setPagina(nueva)
  }

  const noticias = resultado?.items ?? []
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / TAMANIO_PAGINA)) : 1

  let contenido
  if (error) {
    contenido = (
      <p className="noticias-vacio" role="alert">
        No se pudieron cargar las noticias. {error}
      </p>
    )
  } else if (!resultado) {
    contenido = <p className="noticias-vacio">Cargando noticias…</p>
  } else if (noticias.length === 0) {
    contenido = <p className="noticias-vacio">No hay noticias para este filtro.</p>
  } else {
    contenido = (
      // La "key" cambia con los filtros para que la animación se repita.
      <ul className="noticias-lista" key={`${filtro}-${continente}-${pais}-${pagina}`}>
        {noticias.map((noticia, posicion) => (
          <li key={noticia.id} className="noticia" style={{ animationDelay: `${posicion * 50}ms` }}>
            <div className="noticia-humor">
              <Carita tipo={tipoHumor(noticia.valor_humor)} tamano={38} />
              <strong className={`texto-${tipoHumor(noticia.valor_humor)}`}>{formatoHumor(noticia.valor_humor)}</strong>
              <span className="noticia-tipo">{NOMBRE_TIPO[tipoHumor(noticia.valor_humor)]}</span>
            </div>
            <div className="noticia-cuerpo">
              <a className="noticia-titulo" href={noticia.enlace_original} target="_blank" rel="noreferrer">
                {noticia.titulo}
              </a>
              <div className="noticia-datos">
                <span>{noticia.canal}</span>
                <span>{noticia.pais ? `${noticia.pais}, ${noticia.continente}` : noticia.continente}</span>
                {noticia.categoria_iptc && <span>{nombreCategoria(noticia.categoria_iptc)}</span>}
                <span>{formatoFecha(noticia.fecha_publicacion ?? noticia.fecha_registro)}</span>
              </div>
              <button
                type="button"
                className="explicacion-boton"
                aria-expanded={explicada === noticia.id}
                onClick={() => setExplicada(explicada === noticia.id ? null : noticia.id)}
              >
                {explicada === noticia.id ? 'Ocultar explicación' : `¿Por qué ${formatoHumor(noticia.valor_humor)}?`}
              </button>
              {explicada === noticia.id && <ExplicacionHumor noticiaId={noticia.id} />}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="pantalla">
      <div className="noticias-encabezado">
        <div>
          <div className="titulo-con-ayuda">
            <h2>Noticias</h2>
            <Ayuda titulo="Cómo leer las noticias">
              <AyudaPasos pasos={PASOS_AYUDA} />
              <EscalaHumor />
            </Ayuda>
          </div>
          <p>Las que más pesaron en el cálculo del humor: mientras más lejos de 0, más influyó.</p>
        </div>
        <div className="noticias-controles">
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
          <div className="filtros" role="group" aria-label="Filtrar noticias">
            {FILTROS.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                className={opcion.id === filtro ? 'filtro activo' : 'filtro'}
                aria-pressed={opcion.id === filtro}
                onClick={() => cambiarFiltro(opcion.id)}
              >
                {opcion.nombre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {contenido}

      {resultado && resultado.total > TAMANIO_PAGINA && (
        <nav className="paginacion" aria-label="Páginas">
          <button type="button" className="filtro" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)}>
            Anterior
          </button>
          <span>
            Página {pagina} de {totalPaginas} · {resultado.total} noticias
          </span>
          <button
            type="button"
            className="filtro"
            disabled={pagina >= totalPaginas}
            onClick={() => irAPagina(pagina + 1)}
          >
            Siguiente
          </button>
        </nav>
      )}
    </section>
  )
}
