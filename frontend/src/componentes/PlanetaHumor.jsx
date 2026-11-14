// HumWorld - mascota y logo del proyecto: un planeta que flota y pone la cara del
// humor que recibe. Dibujo original hecho con código (SVG).
// Origen: HU-DASH-005 (pedido de la PO del 2026-11-14: reemplaza al cerebro).
// Uso: <PlanetaHumor humor={0.4} tamano={56} />
import { tipoHumor } from '../utilidades/humor.js'

const DESCRIPCION = {
  positivo: 'Planeta contento: el humor del mundo es positivo',
  negativo: 'Planeta triste: el humor del mundo es negativo',
  neutro: 'Planeta tranquilo: el humor del mundo es neutro',
  sinDatos: 'Planeta tranquilo: no hay datos de humor',
}

const TINTA = '#173847'
const MAR = '#5ec4e0'
const TIERRA = '#7ad39a'
const ANILLO = '#dff6ff'

export default function PlanetaHumor({ humor, tamano = 64, animado = true }) {
  const tipo = tipoHumor(humor)

  return (
    <svg
      className={animado ? 'planeta planeta-animado' : 'planeta'}
      viewBox="0 0 120 110"
      width={tamano}
      height={(tamano * 110) / 120}
      role="img"
      aria-label={DESCRIPCION[tipo]}
    >
      {/* Anillo, parte de atrás. */}
      <ellipse cx="60" cy="80" rx="56" ry="12" fill="none" stroke={TINTA} strokeWidth="7" />
      <ellipse cx="60" cy="80" rx="56" ry="12" fill="none" stroke={ANILLO} strokeWidth="3.5" />

      {/* Planeta: mar con contorno. */}
      <circle cx="60" cy="54" r="42" fill={MAR} stroke={TINTA} strokeWidth="4" />

      {/* Continentes. */}
      <g fill={TIERRA} stroke={TINTA} strokeWidth="2.5" strokeLinejoin="round">
        <path d="M30 34 C36 24 50 22 54 30 C57 36 48 40 44 44 C40 48 32 46 30 40 Z" />
        <path d="M76 24 C86 24 96 34 94 44 C90 46 84 40 80 38 C74 36 70 28 76 24 Z" />
        <path d="M84 72 C90 68 98 70 96 78 C92 86 82 88 80 82 C78 78 80 74 84 72 Z" />
        <path d="M28 70 C32 66 38 70 36 76 C34 80 28 80 26 76 Z" />
      </g>

      {/* Anillo, parte de adelante: pasa bajo la cara, por la parte baja del planeta. */}
      <path d="M4 80 A56 12 0 0 0 116 80" fill="none" stroke={TINTA} strokeWidth="7" strokeLinecap="round" />
      <path d="M4 80 A56 12 0 0 0 116 80" fill="none" stroke={ANILLO} strokeWidth="3.5" strokeLinecap="round" />

      {/* Ojos. */}
      <circle cx="47" cy="50" r="5.5" fill={TINTA} />
      <circle cx="73" cy="50" r="5.5" fill={TINTA} />
      <circle cx="48.8" cy="48.2" r="1.8" fill="#ffffff" />
      <circle cx="74.8" cy="48.2" r="1.8" fill="#ffffff" />

      {/* Expresión según el humor. */}
      {tipo === 'positivo' && (
        <>
          <ellipse cx="38" cy="60" rx="6" ry="3.5" fill="#ff8fb1" opacity="0.8" />
          <ellipse cx="82" cy="60" rx="6" ry="3.5" fill="#ff8fb1" opacity="0.8" />
          <path d="M50 60 Q60 74 70 60 Z" fill={TINTA} stroke={TINTA} strokeWidth="3" strokeLinejoin="round" />
        </>
      )}
      {(tipo === 'neutro' || tipo === 'sinDatos') && (
        <path d="M52 65 L68 65" fill="none" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
      )}
      {tipo === 'negativo' && (
        <>
          <path d="M40 40 L52 44" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M80 40 L68 44" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M51 70 Q60 60 69 70" fill="none" stroke={TINTA} strokeWidth="4" strokeLinecap="round" />
          <path d="M82 56 q4 8 0 11 q-4 -3 0 -11 Z" fill="#dff6ff" stroke={TINTA} strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}
