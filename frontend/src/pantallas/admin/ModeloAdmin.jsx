// HumWorld - pestaña "Modelo ML" del panel de administración (opcional en HU-ADMIN-004).
// Origen: HU-SENT-006-v2, HU-SENT-010 y ADR-007 (TF-IDF + Ridge local).
// 1. Modelo activo: versión, noticias usadas y error frente a la referencia (GET /trainings/active),
//    y el botón para entrenar una versión nueva (POST /trainings).
// 2. Probar el modelo: un texto se evalúa con el diccionario (POST /sentiment) y con el modelo
//    (POST /trainings/active/predictions), lado a lado. No se guarda nada.
import { useEffect, useState } from 'react'
import { analizarTexto, entrenarModelo, obtenerModeloActivo, predecirConModelo } from '../../api/cliente.js'
import Carita from '../../componentes/Carita.jsx'
import { formatoHumor, tipoHumor } from '../../utilidades/humor.js'
import Aviso from './Aviso.jsx'

const EJEMPLO = 'Acuerdo de paz pone fin a meses de conflicto en la frontera'

function fechaCorta(iso) {
  return new Date(iso).toLocaleString('es-CL', { dateStyle: 'medium', timeStyle: 'short' })
}

// Cuánto menos se equivoca el modelo que "predecir siempre la media" (ADR-007).
function mejoraFrenteAReferencia(modelo) {
  if (!modelo?.mae_referencia) return null
  return Math.round((1 - modelo.mae_evaluacion / modelo.mae_referencia) * 100)
}

function TarjetaModelo({ modelo }) {
  if (modelo === undefined) return <p className="admin-ayuda">Cargando el modelo activo…</p>
  if (modelo === null) {
    return (
      <p className="admin-ayuda">
        Todavía no hay un modelo activo: todo el humor se calcula con el diccionario. Entrena uno para activarlo.
      </p>
    )
  }
  const mejora = mejoraFrenteAReferencia(modelo)
  const sinDato = 'Sin dato'
  return (
    <dl className="admin-cobertura modelo-tarjeta">
      <div className="modelo-dato-version">
        <dt>Versión activa</dt>
        <dd className="modelo-dato-chico">{fechaCorta(modelo.fecha_entrenamiento)}</dd>
      </div>
      <div>
        <dt>Noticias usadas</dt>
        <dd>{modelo.cantidad_noticias ?? sinDato}</dd>
      </div>
      <div>
        <dt>Error del modelo (MAE)</dt>
        <dd>{modelo.mae_evaluacion.toFixed(2)}</dd>
      </div>
      <div>
        <dt>Error de adivinar la media</dt>
        <dd>{modelo.mae_referencia == null ? sinDato : modelo.mae_referencia.toFixed(2)}</dd>
      </div>
      <div className={mejora > 0 ? 'modelo-dato-mejora' : undefined}>
        <dt>Error frente a adivinar</dt>
        <dd>{mejora === null ? sinDato : `${mejora > 0 ? '−' : '+'}${Math.abs(mejora)} %`}</dd>
      </div>
    </dl>
  )
}

function Resultado({ titulo, valor, detalle, terminos }) {
  const tipo = valor === null || valor === undefined ? 'sinDatos' : tipoHumor(valor)
  return (
    <div className={`modelo-resultado modelo-resultado-${tipo}`}>
      <h4>{titulo}</h4>
      <div className="modelo-resultado-valor">
        <Carita tipo={tipo} tamano={40} />
        <strong>{valor === null || valor === undefined ? 'Sin humor' : formatoHumor(valor)}</strong>
      </div>
      <p>{detalle}</p>
      {terminos?.length > 0 && (
        <ul className="modelo-terminos" aria-label={`Palabras del diccionario: ${titulo}`}>
          {terminos.map((t) => (
            <li key={`${t.palabra}-${t.idioma}`} className={`termino-${tipoHumor(t.valor)}`}>
              {t.palabra} {formatoHumor(t.valor)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ModeloAdmin() {
  const [modelo, setModelo] = useState(undefined)
  const [aviso, setAviso] = useState(null)
  const [enCurso, setEnCurso] = useState(false)
  const [texto, setTexto] = useState('')
  const [comparacion, setComparacion] = useState(null)
  const [avisoPrueba, setAvisoPrueba] = useState(null)
  const [comparando, setComparando] = useState(false)

  useEffect(() => {
    let vigente = true
    obtenerModeloActivo()
      .then((activo) => vigente && setModelo(activo))
      .catch(() => vigente && setModelo(null))
    return () => {
      vigente = false
    }
  }, [])

  async function entrenar() {
    setEnCurso(true)
    setAviso({ tipo: 'info', texto: 'Entrenando el modelo… Suele tardar unos segundos.' })
    try {
      const nuevo = await entrenarModelo()
      setModelo(nuevo)
      setComparacion(null)
      setAviso({
        tipo: 'exito',
        texto: `Versión ${nuevo.version} activa (MAE contra diccionario: ${nuevo.mae_evaluacion.toFixed(2)}).`,
      })
    } catch (causa) {
      setAviso({ tipo: 'error', texto: causa.message })
    } finally {
      setEnCurso(false)
    }
  }

  async function comparar(evento) {
    evento.preventDefault()
    setComparando(true)
    setAvisoPrueba(null)
    try {
      const [diccionario, prediccion] = await Promise.all([analizarTexto(texto), predecirConModelo(texto)])
      setComparacion({ diccionario, prediccion })
    } catch (causa) {
      setComparacion(null)
      setAvisoPrueba({ tipo: 'error', texto: causa.message })
    } finally {
      setComparando(false)
    }
  }

  const palabras = comparacion?.diccionario.cantidad_terminos_evaluados ?? 0

  return (
    <div className="admin-bloques">
      <section className="admin-bloque" aria-labelledby="bloque-modelo-activo">
        <h3 id="bloque-modelo-activo" className="admin-bloque-titulo">
          <span className="admin-bloque-numero">1</span> Modelo activo
        </h3>
        <p className="admin-bloque-texto">
          Se entrena en el propio servidor, sin servicios externos, con las noticias ya evaluadas por diccionario. El
          error (MAE) es cuánto se aleja, en promedio, del diccionario en noticias que no vio al entrenar: mientras más
          bajo que el de adivinar la media, más aprendió.
        </p>
        <TarjetaModelo modelo={modelo} />
        <button type="button" className="filtro activo" disabled={enCurso} onClick={entrenar}>
          Entrenar modelo
        </button>
        <Aviso aviso={aviso} />
      </section>

      <section className="admin-bloque" aria-labelledby="bloque-probar-modelo">
        <h3 id="bloque-probar-modelo" className="admin-bloque-titulo">
          <span className="admin-bloque-numero">2</span> Probar el modelo
        </h3>
        <p className="admin-bloque-texto">
          Escribe un titular y compara cómo lo evalúan el diccionario y el modelo. No se guarda nada.
        </p>
        <form className="modelo-prueba" onSubmit={comparar}>
          <label className="campo modelo-campo-texto">
            Texto a evaluar
            <textarea
              rows={3}
              maxLength={5000}
              value={texto}
              placeholder={EJEMPLO}
              onChange={(evento) => setTexto(evento.target.value)}
            />
          </label>
          <div className="modelo-prueba-acciones">
            <button type="submit" className="filtro activo" disabled={!modelo || comparando || texto.trim() === ''}>
              Comparar
            </button>
            <button type="button" className="filtro" onClick={() => setTexto(EJEMPLO)}>
              Usar un ejemplo
            </button>
          </div>
        </form>
        {!modelo && modelo !== undefined && <p className="admin-ayuda">Entrena un modelo para poder probarlo.</p>}
        <Aviso aviso={avisoPrueba} />
        {comparacion && (
          <div className="modelo-comparacion" role="region" aria-label="Comparación diccionario y modelo">
            <Resultado
              titulo="Diccionario"
              valor={comparacion.diccionario.valor_humor}
              detalle={
                palabras === 0
                  ? 'Ninguna palabra del diccionario: no puede darle humor.'
                  : `Promedio de ${palabras} ${palabras === 1 ? 'palabra' : 'palabras'} del diccionario.`
              }
              terminos={comparacion.diccionario.terminos}
            />
            <Resultado
              titulo="Modelo"
              valor={comparacion.prediccion.valor_humor}
              detalle="Lee todas las palabras del texto, también las que no están en el diccionario."
            />
          </div>
        )}
      </section>
    </div>
  )
}
