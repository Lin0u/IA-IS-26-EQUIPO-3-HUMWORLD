// HumWorld - recuadro "Cómo leer esta pantalla": pasos numerados que explican qué
// muestra cada vista y cómo usarla.
// Origen: HU-DASH-004 (observación del profesor del 2026-11-11: no se entendía qué
// era cada cosa). Se muestra abierta por defecto y se puede ocultar.
import { useState } from 'react'

export default function GuiaPantalla({ pasos, children }) {
  const [abierta, setAbierta] = useState(true)

  return (
    <aside className="guia" aria-label="Cómo leer esta pantalla">
      <div className="guia-encabezado">
        <strong>Cómo leer esta pantalla</strong>
        <button type="button" className="guia-boton" aria-expanded={abierta} onClick={() => setAbierta(!abierta)}>
          {abierta ? 'Ocultar guía' : 'Mostrar guía'}
        </button>
      </div>
      {abierta && (
        <>
          <ol className="guia-pasos">
            {pasos.map((paso) => (
              <li key={paso.titulo}>
                <span className="guia-titulo">{paso.titulo}</span>
                <span className="guia-texto">{paso.texto}</span>
              </li>
            ))}
          </ol>
          {children}
        </>
      )}
    </aside>
  )
}
