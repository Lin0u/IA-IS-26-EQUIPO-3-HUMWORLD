// HumWorld - pestaña "Diccionario" del panel de administración.
// Origen: HU-SENT-001-v2 (CRUD del diccionario; PDF §4.2.2: "operaciones CRUD para
// cada término con endpoints API REST e interface de usuario"). El listado se pagina
// en el backend, de 25 en 25. HU-SENT-001-v3: se filtra por idioma y por rango de valor;
// el alta se abre con el botón "+ Agregar término".
import { useEffect, useState } from 'react'
import { actualizarTermino, crearTermino, eliminarTermino, obtenerTerminos } from '../../api/cliente.js'
import Aviso from './Aviso.jsx'

const POR_PAGINA = 25
const IDIOMAS = { es: 'Español', en: 'Inglés' }

// Escala del diccionario: enteros de -10 a +10 (ADR-003, sección 11 de las instrucciones).
function valorValido(texto) {
  return /^-?\d+$/.test(texto) && Number(texto) >= -10 && Number(texto) <= 10
}

// Rangos de valor para filtrar el listado (escala de -10 a +10).
const RANGOS = {
  todos: { nombre: 'Todos', valorMin: null, valorMax: null },
  negativos: { nombre: 'Negativos (-10 a -1)', valorMin: null, valorMax: -1 },
  positivos: { nombre: 'Positivos (+1 a +10)', valorMin: 1, valorMax: null },
  muyNegativos: { nombre: 'Muy negativos (-10 a -6)', valorMin: null, valorMax: -6 },
  muyPositivos: { nombre: 'Muy positivos (+6 a +10)', valorMin: 6, valorMax: null },
}

const AVISO_RECALCULO = 'El humor de las noticias se recalculará en el próximo barrido.'

export default function DiccionarioAdmin() {
  const [busqueda, setBusqueda] = useState('')
  const [idioma, setIdioma] = useState('')
  const [rango, setRango] = useState('todos')
  const [pagina, setPagina] = useState(1)
  const [version, setVersion] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [nuevo, setNuevo] = useState({ palabra: '', idioma: 'es', valor: '' })
  const [edicion, setEdicion] = useState(null)
  // El formulario de alta se abre con "+ Agregar término", a la derecha de los filtros.
  const [agregando, setAgregando] = useState(false)

  useEffect(() => {
    let vigente = true
    const { valorMin, valorMax } = RANGOS[rango]
    obtenerTerminos({ busqueda, idioma, valorMin, valorMax, pagina, tamanioPagina: POR_PAGINA })
      .then((datos) => vigente && setResultado(datos))
      .catch((causa) => vigente && setAviso({ tipo: 'error', texto: causa.message }))
    return () => {
      vigente = false
    }
  }, [busqueda, idioma, rango, pagina, version])

  // Cada filtro nuevo vuelve a la primera página.
  function filtrar(cambiar, valor) {
    cambiar(valor)
    setPagina(1)
  }

  function recargar() {
    setVersion((v) => v + 1)
  }

  async function ejecutar(accion, textoExito) {
    try {
      await accion()
      setAviso({ tipo: 'exito', texto: `${textoExito} ${AVISO_RECALCULO}` })
      recargar()
      return true
    } catch (causa) {
      setAviso({ tipo: 'error', texto: causa.message })
      return false
    }
  }

  async function crear(evento) {
    evento.preventDefault()
    const ok = await ejecutar(
      () => crearTermino({ palabra: nuevo.palabra.trim(), idioma: nuevo.idioma, valor: Number(nuevo.valor) }),
      `Término "${nuevo.palabra.trim()}" creado.`,
    )
    if (ok) {
      setNuevo({ palabra: '', idioma: nuevo.idioma, valor: '' })
      setAgregando(false)
    }
  }

  function cerrarFormulario() {
    setAgregando(false)
    setNuevo({ palabra: '', idioma: nuevo.idioma, valor: '' })
  }

  async function guardarEdicion() {
    const ok = await ejecutar(
      () => actualizarTermino(edicion.id, { valor: Number(edicion.valor) }),
      'Valor actualizado.',
    )
    if (ok) setEdicion(null)
  }

  function eliminar(termino) {
    if (!window.confirm(`¿Eliminar el término "${termino.palabra}" (${termino.idioma})?`)) return
    ejecutar(() => eliminarTermino(termino.id), `Término "${termino.palabra}" eliminado.`)
  }

  const nuevoValido = nuevo.palabra.trim() !== '' && valorValido(nuevo.valor)
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / POR_PAGINA)) : 1

  return (
    <div>
      <div className="admin-barra-diccionario">
        <div className="admin-fila-formulario" role="search" aria-label="Filtros del diccionario">
          <label className="campo admin-buscador">
            Buscar
            <input type="search" value={busqueda} onChange={(e) => filtrar(setBusqueda, e.target.value)} />
          </label>
          <label className="campo">
            Idioma
            <select value={idioma} onChange={(e) => filtrar(setIdioma, e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(IDIOMAS).map(([codigo, nombre]) => (
                <option key={codigo} value={codigo}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Valor
            <select value={rango} onChange={(e) => filtrar(setRango, e.target.value)}>
              {Object.entries(RANGOS).map(([clave, { nombre }]) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="filtro activo admin-boton-agregar"
          aria-expanded={agregando}
          aria-controls="formulario-nuevo-termino"
          onClick={() => (agregando ? cerrarFormulario() : setAgregando(true))}
        >
          + Agregar término
        </button>
      </div>

      {agregando && (
        <div className="admin-panel-nuevo">
          <p className="admin-subtitulo">Nuevo término</p>
          <form
            id="formulario-nuevo-termino"
            className="admin-fila-formulario"
            onSubmit={crear}
            aria-label="Nuevo término"
          >
            <label className="campo">
              Palabra
              <input value={nuevo.palabra} onChange={(e) => setNuevo({ ...nuevo, palabra: e.target.value })} />
            </label>
            <label className="campo">
              Idioma
              <select value={nuevo.idioma} onChange={(e) => setNuevo({ ...nuevo, idioma: e.target.value })}>
                {Object.entries(IDIOMAS).map(([codigo, nombre]) => (
                  <option key={codigo} value={codigo}>
                    {nombre}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              Valor
              <input
                type="number"
                min="-10"
                max="10"
                value={nuevo.valor}
                onChange={(e) => setNuevo({ ...nuevo, valor: e.target.value })}
              />
            </label>
            <button type="submit" className="filtro activo" disabled={!nuevoValido}>
              Agregar
            </button>
            <button type="button" className="filtro" onClick={cerrarFormulario}>
              Cancelar
            </button>
          </form>
          {nuevo.valor !== '' && !valorValido(nuevo.valor) && (
            <p className="admin-ayuda">El valor debe ser un entero entre -10 y +10.</p>
          )}
        </div>
      )}

      <Aviso aviso={aviso} />

      {!resultado ? (
        <p>Cargando términos…</p>
      ) : (
        <>
          <p className="admin-ayuda">{resultado.total} términos encontrados.</p>
          <table className="admin-tabla">
            <thead>
              <tr>
                <th>Palabra</th>
                <th>Idioma</th>
                <th>Valor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {resultado.items.map((termino) => (
                <tr key={termino.id}>
                  <td>{termino.palabra}</td>
                  <td>{IDIOMAS[termino.idioma] ?? termino.idioma}</td>
                  <td>
                    {edicion?.id === termino.id ? (
                      <input
                        type="number"
                        min="-10"
                        max="10"
                        aria-label={`Nuevo valor de ${termino.palabra}`}
                        value={edicion.valor}
                        onChange={(e) => setEdicion({ ...edicion, valor: e.target.value })}
                      />
                    ) : (
                      termino.valor
                    )}
                  </td>
                  <td>
                    <div className="admin-acciones admin-acciones-fila">
                      {edicion?.id === termino.id ? (
                        <>
                          <button
                            type="button"
                            className="filtro activo"
                            disabled={!valorValido(edicion.valor)}
                            onClick={guardarEdicion}
                          >
                            Guardar
                          </button>
                          <button type="button" className="filtro" onClick={() => setEdicion(null)}>
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="filtro"
                            onClick={() => setEdicion({ id: termino.id, valor: String(termino.valor) })}
                          >
                            Editar
                          </button>
                          <button type="button" className="filtro" onClick={() => eliminar(termino)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {resultado.total > POR_PAGINA && (
            <nav className="paginacion" aria-label="Páginas del diccionario">
              <button type="button" className="filtro" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>
                Anterior
              </button>
              <span>
                Página {pagina} de {totalPaginas}
              </span>
              <button
                type="button"
                className="filtro"
                disabled={pagina >= totalPaginas}
                onClick={() => setPagina(pagina + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
