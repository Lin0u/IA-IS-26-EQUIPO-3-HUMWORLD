// HumWorld - pantalla "Administración" (panel de administración unificado).
// Origen: HU-ADMIN-004 (PDF §4.3, vista 1; §4.1 punto 4; §4.2.2; §4.2.3; §4.2.5).
// Cada pestaña usa endpoints que ya existen en la API; ninguno es nuevo.
// HU-DASH-004-v2: cada pestaña explica lo que hace con ayudas "?" junto a cada
// parte (en Fuentes RSS y Parámetros, en el título de cada bloque).
import { useState } from 'react'
import DiccionarioAdmin from './admin/DiccionarioAdmin.jsx'
import FuentesAdmin from './admin/FuentesAdmin.jsx'
import ModeloAdmin from './admin/ModeloAdmin.jsx'
import ParametrosAdmin from './admin/ParametrosAdmin.jsx'
import PurgadoAdmin from './admin/PurgadoAdmin.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import Ayuda from '../componentes/Ayuda.jsx'
import AyudaPasos from '../componentes/AyudaPasos.jsx'
import '../componentes/GuiaVisual.css'
import './Administracion.css'

// Ayudas de las pestañas sin bloques numerados. Fuentes RSS y Parámetros las
// tienen en el título de cada bloque.
const AYUDAS = {
  diccionario: [
    {
      titulo: 'Cada palabra tiene un valor',
      texto: 'De -10 (muy negativa) a +10 (muy positiva), en español o inglés.',
    },
    {
      titulo: 'Así se calcula el humor',
      texto: 'El humor de una noticia es el promedio de los valores de las palabras que contiene.',
    },
    {
      titulo: 'Los cambios se aplican solos',
      texto: 'Al crear, editar o borrar una palabra, el humor de las noticias se recalcula en el próximo barrido.',
    },
  ],
  purgado: [
    { titulo: 'Por fecha', texto: 'Borra las noticias registradas antes del día que elijas.' },
    { titulo: 'Según caducidad', texto: 'Borra las que superan los días configurados en Parámetros.' },
    { titulo: 'No se puede deshacer', texto: 'Por eso siempre se pide confirmación antes de borrar.' },
  ],
  modelo: [
    {
      titulo: 'Qué hace',
      texto: 'Entrena un modelo que aprende a calcular el humor leyendo el texto completo, imitando al diccionario.',
    },
    { titulo: 'Qué necesita', texto: 'La clave de Gemini en el servidor y al menos 1.000 noticias evaluadas.' },
    {
      titulo: 'Qué cambia',
      texto: 'Las noticias nuevas se calculan con el modelo. Si falla, el sistema vuelve solo al diccionario.',
    },
  ],
}

const PESTANAS = [
  { id: 'fuentes', nombre: 'Fuentes RSS', Componente: FuentesAdmin },
  { id: 'diccionario', nombre: 'Diccionario', titulo: 'Diccionario de términos', Componente: DiccionarioAdmin },
  { id: 'parametros', nombre: 'Parámetros', Componente: ParametrosAdmin },
  { id: 'purgado', nombre: 'Purgado', titulo: 'Purgado de noticias', Componente: PurgadoAdmin },
  { id: 'modelo', nombre: 'Modelo ML', titulo: 'Modelo de humor (ML)', Componente: ModeloAdmin },
]

export default function Administracion() {
  const [activa, setActiva] = useState('fuentes')
  const { Componente, titulo } = PESTANAS.find((pestana) => pestana.id === activa)

  return (
    <section className="pantalla">
      <div className="admin-encabezado">
        <h2>Administración</h2>
        <p>Fuentes RSS, diccionario, parámetros, purgado y modelo de humor.</p>
      </div>
      <div className="admin-pestanas" role="tablist" aria-label="Secciones de administración">
        {PESTANAS.map((pestana) => (
          <button
            key={pestana.id}
            type="button"
            role="tab"
            aria-selected={pestana.id === activa}
            className={pestana.id === activa ? 'filtro activo' : 'filtro'}
            onClick={() => setActiva(pestana.id)}
          >
            {pestana.nombre}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="admin-panel">
        {AYUDAS[activa] && (
          <div className="titulo-con-ayuda">
            <h3 className="admin-panel-titulo">{titulo}</h3>
            <Ayuda titulo={titulo}>
              <AyudaPasos pasos={AYUDAS[activa]} />
              {activa === 'diccionario' && <EscalaHumor />}
            </Ayuda>
          </div>
        )}
        <Componente />
      </div>
    </section>
  )
}
