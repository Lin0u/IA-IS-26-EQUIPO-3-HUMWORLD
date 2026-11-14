// HumWorld - estructura base del frontend: cabecera con la mascota, menú lateral y pantalla activa.
// Cada pantalla vive en su propio archivo dentro de src/pantallas.
// HU-DASH-005 (bosquejo de la PO del 2026-11-14): la cabecera muestra el logo a la
// izquierda y el botón ☰ a la derecha, que abre un menú lateral con las vistas
// arriba y Administración abajo.
// Origen: HU-DASH-001-v3 a HU-DASH-003-v2, HU-ADMIN-004 y ADR-005. El mapa usa datos reales del
// backend; la nube y el listado siguen con datos de ejemplo hasta tener sus endpoints.
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { obtenerMapa } from './api/cliente.js'
import CerebroHumor from './componentes/CerebroHumor.jsx'
import Administracion from './pantallas/Administracion.jsx'
import ListadoNoticias from './pantallas/ListadoNoticias.jsx'
import MapaHumor from './pantallas/MapaHumor.jsx'
import NubePalabras from './pantallas/NubePalabras.jsx'
import { formatoHumor, tipoHumor } from './utilidades/humor.js'

// Vistas del menú lateral. Para agregar una pantalla nueva, se suma una línea aquí.
// Administración va aparte, al pie del menú.
const VISTAS = [
  { id: 'mapa', nombre: 'Mapa de humor' },
  { id: 'nube', nombre: 'Nube de palabras' },
  { id: 'noticias', nombre: 'Noticias' },
]

// Ícono de usuario para Administración (dibujo propio, sin librerías).
function IconoUsuario() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className="icono-usuario">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  )
}

export default function App() {
  // Guarda cuál pantalla se está mostrando. Parte en el mapa.
  const [pantallaActiva, setPantallaActiva] = useState('mapa')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const botonMenu = useRef(null)
  const botonCerrar = useRef(null)

  // Fecha elegida. Vive aquí, y no dentro del mapa, porque la usan dos piezas:
  // el mapa y la mascota de la cabecera. null = el último día con datos.
  const [fecha, setFecha] = useState(null)
  const [mapa, setMapa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // Pide al backend los datos del mapa cada vez que cambia la fecha.
  useEffect(() => {
    let vigente = true
    obtenerMapa(fecha)
      .then((datos) => {
        if (vigente) {
          setMapa(datos)
          setError(null)
        }
      })
      .catch((causa) => vigente && setError(causa.message))
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [fecha])

  // Con el menú abierto: el foco va al botón de cerrar y Escape lo cierra.
  useEffect(() => {
    if (!menuAbierto) return undefined
    botonCerrar.current?.focus()
    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') cerrarMenu()
    }
    document.addEventListener('keydown', alPresionarTecla)
    return () => document.removeEventListener('keydown', alPresionarTecla)
  }, [menuAbierto])

  function cerrarMenu() {
    setMenuAbierto(false)
    botonMenu.current?.focus()
  }

  function irA(id) {
    setPantallaActiva(id)
    cerrarMenu()
  }

  function botonVista(vista, clase) {
    const activa = vista.id === pantallaActiva
    return (
      <button
        key={vista.id}
        type="button"
        className={activa ? `${clase} activo` : clase}
        aria-current={activa ? 'page' : undefined}
        onClick={() => irA(vista.id)}
      >
        {vista.id === 'admin' && <IconoUsuario />}
        {vista.nombre}
      </button>
    )
  }

  function cambiarFecha(nuevaFecha) {
    setCargando(true)
    setFecha(nuevaFecha)
  }

  // Humor global de la fecha elegida: decide la cara de la mascota.
  const humorGlobal = mapa?.global?.humor_promedio ?? null

  return (
    <div className="app">
      <header className="cabecera">
        <h1 className="solo-lector">HumWorld</h1>
        <button type="button" className="marca" onClick={() => irA('mapa')} aria-label="HumWorld: ir al mapa de humor">
          <CerebroHumor humor={humorGlobal} tamano={52} />
          <span className="marca-textos">
            <span className="marca-nombre">HumWorld</span>
            <span className="marca-frase">
              Humor del mundo
              <strong className={`texto-${tipoHumor(humorGlobal)}`}>{formatoHumor(humorGlobal)}</strong>
            </span>
          </span>
        </button>
        <button
          ref={botonMenu}
          type="button"
          className="boton-menu"
          aria-label="Abrir menú"
          aria-expanded={menuAbierto}
          aria-controls="menu-lateral"
          onClick={() => setMenuAbierto(true)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menuAbierto && (
        <>
          <div className="menu-fondo" onClick={cerrarMenu} aria-hidden="true" />
          <nav id="menu-lateral" className="menu-lateral" aria-label="Pantallas">
            <div className="menu-lateral-cabecera">
              <span>Menú</span>
              <button
                ref={botonCerrar}
                type="button"
                className="menu-cerrar"
                aria-label="Cerrar menú"
                onClick={cerrarMenu}
              >
                ×
              </button>
            </div>
            <div className="menu-vistas">{VISTAS.map((vista) => botonVista(vista, 'menu-boton'))}</div>
            <div className="menu-pie">
              {botonVista({ id: 'admin', nombre: 'Administración' }, 'menu-boton menu-admin')}
            </div>
          </nav>
        </>
      )}

      <main className="contenido">
        {pantallaActiva === 'mapa' && (
          <MapaHumor mapa={mapa} cargando={cargando} error={error} alCambiarFecha={cambiarFecha} />
        )}
        {pantallaActiva === 'nube' && <NubePalabras />}
        {pantallaActiva === 'noticias' && <ListadoNoticias />}
        {pantallaActiva === 'admin' && <Administracion />}
      </main>
    </div>
  )
}
