// HumWorld - pestaña "Parámetros" del panel de administración, en 3 bloques.
// Origen: HU-RSS-007 (periodicidad del cron), HU-ADMIN-001-v2 (caducidad de las
// noticias), HU-SENT-007-v4 (mínimo de palabras por noticia) y HU-SENT-009 (lista
// de exclusión y cobertura). GET/PUT /config, GET/POST/DELETE /exclusions y
// GET /news/statistics.
import { useEffect, useState } from 'react'
import {
  crearExclusion,
  eliminarExclusion,
  guardarConfiguracion,
  obtenerConfiguracion,
  obtenerEstadisticasNoticias,
  obtenerExclusiones,
} from '../../api/cliente.js'
import Aviso from './Aviso.jsx'
import Ayuda from '../../componentes/Ayuda.jsx'
import AyudaPasos from '../../componentes/AyudaPasos.jsx'

// Los parámetros son enteros mayores o iguales a 1 (contrato de /config).
function esValido(texto) {
  return /^\d+$/.test(texto) && Number(texto) >= 1
}

const AVISO_RECALCULO = 'El humor de las noticias se recalculará en el próximo barrido.'

function aTexto(datos) {
  return {
    periodicidad: String(datos.periodicidad_cron_minutos),
    caducidad: String(datos.caducidad_noticias_dias),
    minimo: String(datos.minimo_terminos_humor),
  }
}

export default function ParametrosAdmin() {
  const [valores, setValores] = useState(null)
  const [guardados, setGuardados] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [exclusiones, setExclusiones] = useState([])
  const [nuevaPalabra, setNuevaPalabra] = useState('')
  const [avisoLista, setAvisoLista] = useState(null)
  // HU-ADMIN-001-v2, ajuste del 2026-11-12: la lista se muestra al presionar "Ver palabras (N)".
  const [verLista, setVerLista] = useState(false)
  const [estadisticas, setEstadisticas] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    obtenerConfiguracion()
      .then((datos) => {
        if (vigente) {
          setValores(aTexto(datos))
          setGuardados(aTexto(datos))
        }
      })
      .catch((causa) => vigente && setAviso({ tipo: 'error', texto: causa.message }))
    obtenerExclusiones()
      .then((lista) => vigente && setExclusiones(lista))
      .catch((causa) => vigente && setAvisoLista({ tipo: 'error', texto: causa.message }))
    return () => {
      vigente = false
    }
  }, [])

  useEffect(() => {
    let vigente = true
    obtenerEstadisticasNoticias()
      .then((datos) => vigente && setEstadisticas(datos))
      .catch(() => vigente && setEstadisticas(null))
    return () => {
      vigente = false
    }
  }, [version])

  const recargarEstadisticas = () => setVersion((v) => v + 1)

  async function guardar(evento) {
    evento.preventDefault()
    setGuardando(true)
    try {
      const datos = await guardarConfiguracion({
        periodicidad: Number(valores.periodicidad),
        caducidad: Number(valores.caducidad),
        minimoTerminos: Number(valores.minimo),
      })
      const cambioMinimo = guardados && datos.minimo_terminos_humor !== Number(guardados.minimo)
      setValores(aTexto(datos))
      setGuardados(aTexto(datos))
      setAviso({
        tipo: 'exito',
        texto: cambioMinimo ? `Parámetros guardados. ${AVISO_RECALCULO}` : 'Parámetros guardados.',
      })
      recargarEstadisticas()
    } catch (causa) {
      setAviso({ tipo: 'error', texto: causa.message })
    } finally {
      setGuardando(false)
    }
  }

  async function agregarPalabra(evento) {
    evento.preventDefault()
    try {
      const creada = await crearExclusion(nuevaPalabra.trim())
      setExclusiones([...exclusiones, creada].sort((a, b) => a.palabra.localeCompare(b.palabra, 'es')))
      setNuevaPalabra('')
      setAvisoLista({ tipo: 'exito', texto: `"${creada.palabra}" agregada. ${AVISO_RECALCULO}` })
      recargarEstadisticas()
    } catch (causa) {
      setAvisoLista({ tipo: 'error', texto: causa.message })
    }
  }

  async function quitarPalabra(exclusion) {
    try {
      await eliminarExclusion(exclusion.id)
      setExclusiones(exclusiones.filter((e) => e.id !== exclusion.id))
      setAvisoLista({ tipo: 'exito', texto: `"${exclusion.palabra}" quitada. ${AVISO_RECALCULO}` })
      recargarEstadisticas()
    } catch (causa) {
      setAvisoLista({ tipo: 'error', texto: causa.message })
    }
  }

  if (!valores) {
    return aviso ? <Aviso aviso={aviso} /> : <p>Cargando parámetros…</p>
  }

  const validos = esValido(valores.periodicidad) && esValido(valores.caducidad) && esValido(valores.minimo)

  return (
    <div className="admin-bloques">
      <form className="admin-bloque" onSubmit={guardar} aria-labelledby="bloque-parametros">
        <div className="titulo-con-ayuda">
          <h3 id="bloque-parametros" className="admin-bloque-titulo">
            <span className="admin-bloque-numero">1</span> Captura, caducidad y mínimo de palabras
          </h3>
          <Ayuda titulo="Periodicidad, caducidad y mínimo">
            <AyudaPasos
              pasos={[
                { titulo: 'Periodicidad', texto: 'Cada cuántos minutos se capturan noticias.' },
                { titulo: 'Caducidad', texto: 'Cuántos días se guardan antes del purgado.' },
                {
                  titulo: 'Mínimo de palabras',
                  texto: 'Una noticia necesita al menos esa cantidad de palabras del diccionario para tener humor.',
                },
              ]}
            />
          </Ayuda>
        </div>
        <div className="admin-formulario">
          <label className="campo">
            Periodicidad del cron (minutos)
            <input
              type="number"
              min="1"
              value={valores.periodicidad}
              onChange={(evento) => setValores({ ...valores, periodicidad: evento.target.value })}
            />
          </label>
          <label className="campo">
            Caducidad de las noticias (días)
            <input
              type="number"
              min="1"
              value={valores.caducidad}
              onChange={(evento) => setValores({ ...valores, caducidad: evento.target.value })}
            />
          </label>
          <label className="campo">
            Mínimo de palabras del diccionario por noticia
            <input
              type="number"
              min="1"
              value={valores.minimo}
              onChange={(evento) => setValores({ ...valores, minimo: evento.target.value })}
            />
          </label>
          <p className="admin-ayuda">
            Una noticia con menos palabras del diccionario que este mínimo se guarda, pero queda sin humor: no cuenta en
            el mapa, la nube ni el listado. Así una sola palabra no decide el humor de toda la noticia.
          </p>
          {!validos && <p className="admin-ayuda">Los valores deben ser enteros mayores o iguales a 1.</p>}
          <button type="submit" className="filtro activo" disabled={!validos || guardando}>
            Guardar
          </button>
          <Aviso aviso={aviso} />
        </div>
      </form>

      <section className="admin-bloque" aria-labelledby="bloque-exclusion">
        <div className="titulo-con-ayuda">
          <h3 id="bloque-exclusion" className="admin-bloque-titulo">
            <span className="admin-bloque-numero">2</span> Lista de exclusión
          </h3>
          <Ayuda titulo="Lista de exclusión">
            Las noticias con estas palabras en el título (lotería, horóscopo…) no se cuentan.
          </Ayuda>
        </div>
        <p className="admin-bloque-texto">
          Si una de estas palabras aparece en el título, la noticia no refleja el ánimo del mundo (sorteos, horóscopo,
          pasatiempos) y no se calcula su humor. No distingue mayúsculas ni tildes, y compara la palabra completa.
        </p>
        {exclusiones.length === 0 ? (
          <p className="admin-ayuda">La lista está vacía: no se excluye ninguna noticia.</p>
        ) : (
          <button
            type="button"
            className="filtro admin-ver-lista"
            aria-expanded={verLista}
            aria-controls="lista-exclusion"
            onClick={() => setVerLista(!verLista)}
          >
            {verLista ? 'Ocultar palabras' : `Ver palabras (${exclusiones.length})`}
          </button>
        )}
        {verLista && exclusiones.length > 0 && (
          <ul className="admin-exclusiones" id="lista-exclusion" aria-label="Palabras de exclusión">
            {exclusiones.map((exclusion) => (
              <li key={exclusion.id}>
                {exclusion.palabra}
                <button
                  type="button"
                  className="admin-quitar"
                  aria-label={`Quitar ${exclusion.palabra}`}
                  onClick={() => quitarPalabra(exclusion)}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="admin-fila-formulario" onSubmit={agregarPalabra} aria-label="Nueva palabra de exclusión">
          <label className="campo">
            Palabra o frase
            <input
              placeholder="Ej.: quiniela"
              value={nuevaPalabra}
              onChange={(evento) => setNuevaPalabra(evento.target.value)}
            />
          </label>
          <button type="submit" className="filtro activo" disabled={nuevaPalabra.trim() === ''}>
            Agregar
          </button>
        </form>
        <Aviso aviso={avisoLista} />
      </section>

      <section className="admin-bloque" aria-labelledby="bloque-cobertura">
        <div className="titulo-con-ayuda">
          <h3 id="bloque-cobertura" className="admin-bloque-titulo">
            <span className="admin-bloque-numero">3</span> Cobertura de noticias
          </h3>
          <Ayuda titulo="Cobertura">Muestra cuántas noticias tienen humor y por qué quedaron fuera las demás.</Ayuda>
        </div>
        <p className="admin-bloque-texto">
          Cuántas noticias guardadas tienen humor y por qué quedaron fuera las demás. Úsalo para ajustar el mínimo y la
          lista.
        </p>
        {!estadisticas ? (
          <p className="admin-ayuda">No se pudo cargar la cobertura.</p>
        ) : (
          <>
            <dl className="admin-cobertura">
              <div>
                <dt>Con humor</dt>
                <dd>{estadisticas.con_humor}</dd>
              </div>
              <div>
                <dt>Sin palabras del diccionario</dt>
                <dd>{estadisticas.sin_terminos}</dd>
              </div>
              <div>
                <dt>Con menos de {estadisticas.minimo_terminos_humor} palabras</dt>
                <dd>{estadisticas.bajo_minimo_terminos}</dd>
              </div>
              <div>
                <dt>Excluidas por la lista</dt>
                <dd>{estadisticas.excluidas_por_lista}</dd>
              </div>
              <div>
                <dt>Por calcular</dt>
                <dd>{estadisticas.pendientes}</dd>
              </div>
              <div>
                <dt>Total guardadas</dt>
                <dd>{estadisticas.total}</dd>
              </div>
            </dl>
            {estadisticas.pendientes > 0 && (
              <p className="admin-ayuda">
                Las noticias por calcular se procesan en el próximo barrido; hasta entonces conservan su valor anterior.
              </p>
            )}
            <button type="button" className="filtro" onClick={recargarEstadisticas}>
              Actualizar
            </button>
          </>
        )}
      </section>
    </div>
  )
}
