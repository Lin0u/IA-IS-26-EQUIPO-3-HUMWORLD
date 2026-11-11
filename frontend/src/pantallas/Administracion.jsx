// HumWorld - pantalla "Administración" (panel de administración unificado).
// Origen: HU-ADMIN-004 (PDF §4.3, vista 1; §4.1 punto 4; §4.2.2; §4.2.3; §4.2.5).
// Cada pestaña usa endpoints que ya existen en la API; ninguno es nuevo.
// HU-DASH-004: cada pestaña abre con una guía de lo que hace.
import { useState } from 'react'
import DiccionarioAdmin from './admin/DiccionarioAdmin.jsx'
import FuentesAdmin from './admin/FuentesAdmin.jsx'
import ModeloAdmin from './admin/ModeloAdmin.jsx'
import ParametrosAdmin from './admin/ParametrosAdmin.jsx'
import PurgadoAdmin from './admin/PurgadoAdmin.jsx'
import EscalaHumor from '../componentes/EscalaHumor.jsx'
import GuiaPantalla from '../componentes/GuiaPantalla.jsx'
import '../componentes/GuiaVisual.css'
import './Administracion.css'

const GUIAS = {
  fuentes: [
    {
      titulo: 'Bloque 1: el canal',
      texto: 'Es el medio (por ejemplo, RNZ) con su continente y país. De ahí sale dónde aparece en el mapa.',
    },
    {
      titulo: 'Bloque 2: sus fuentes RSS',
      texto: 'Son los feeds del medio (business.xml, sport.xml…), cada uno con su categoría. Un canal tiene varias.',
    },
    {
      titulo: 'Bloque 3: captura',
      texto: 'El sistema lee las fuentes activas cada cierto tiempo. "Capturar ahora" lo hace en el momento.',
    },
  ],
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
  parametros: [
    {
      titulo: 'Periodicidad',
      texto: 'Cada cuántos minutos el sistema captura noticias nuevas de las fuentes activas.',
    },
    { titulo: 'Caducidad', texto: 'Cuántos días se guarda una noticia antes de que el purgado automático la borre.' },
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
  { id: 'diccionario', nombre: 'Diccionario', Componente: DiccionarioAdmin },
  { id: 'parametros', nombre: 'Parámetros', Componente: ParametrosAdmin },
  { id: 'purgado', nombre: 'Purgado', Componente: PurgadoAdmin },
  { id: 'modelo', nombre: 'Modelo ML', Componente: ModeloAdmin },
]

export default function Administracion() {
  const [activa, setActiva] = useState('fuentes')
  const { Componente } = PESTANAS.find((pestana) => pestana.id === activa)

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
        <GuiaPantalla key={activa} pasos={GUIAS[activa]}>
          {activa === 'diccionario' && <EscalaHumor />}
        </GuiaPantalla>
        <Componente />
      </div>
    </section>
  )
}
