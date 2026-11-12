// HumWorld - ícono "?" de ayuda contextual, junto a la parte de la pantalla que
// explica. Al pasar el mouse o enfocarlo con el teclado muestra qué es y qué hace
// esa parte; en el celular se abre y se cierra tocándolo. Escape lo cierra.
// Origen: HU-DASH-004-v2 (decisión de la PO del 2026-11-12: reemplaza el recuadro
// ancho "Cómo leer esta pantalla" por ayudas junto a cada parte).
import { useEffect, useId, useRef, useState } from 'react'
import './GuiaVisual.css'

export default function Ayuda({ titulo, children, alinear = 'izquierda' }) {
  const id = useId()
  const [abierta, setAbierta] = useState(false)
  const contenedor = useRef(null)

  // Abierta con un toque, se cierra al tocar fuera.
  useEffect(() => {
    if (!abierta) return undefined
    function alTocarFuera(evento) {
      if (contenedor.current && !contenedor.current.contains(evento.target)) setAbierta(false)
    }
    document.addEventListener('pointerdown', alTocarFuera)
    return () => document.removeEventListener('pointerdown', alTocarFuera)
  }, [abierta])

  return (
    <span
      ref={contenedor}
      className={`ayuda ayuda-${alinear}${abierta ? ' ayuda-abierta' : ''}`}
      onKeyDown={(evento) => evento.key === 'Escape' && setAbierta(false)}
    >
      <button
        type="button"
        className="ayuda-boton"
        aria-label={`Ayuda: ${titulo}`}
        aria-describedby={id}
        aria-expanded={abierta}
        onClick={() => setAbierta(!abierta)}
      >
        ?
      </button>
      <span role="tooltip" id={id} className="ayuda-globo">
        <strong className="ayuda-titulo">{titulo}</strong>
        {children}
      </span>
    </span>
  )
}
