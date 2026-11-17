// HumWorld - mascota y logo del proyecto: un globo de escritorio que flota y pone
// la cara del humor que recibe. Dibujo original hecho con código (SVG).
// Origen: HU-DASH-005 (pedido de la PO del 2026-11-14: reemplaza al cerebro) y
// HU-DASH-005-v3 (decisión de la PO del 2026-11-16: globo con meridiano de latón).
// Uso: <PlanetaHumor humor={0.4} tamano={56} />
import { tipoHumor } from '../utilidades/humor.js'

const DESCRIPCION = {
  positivo: 'Planeta contento: el humor del mundo es positivo',
  negativo: 'Planeta triste: el humor del mundo es negativo',
  neutro: 'Planeta tranquilo: el humor del mundo es neutro',
  sinDatos: 'Planeta tranquilo: no hay datos de humor',
}

const TINTA = '#2a3a44'
const MAR = '#a9cad5'
const MAR_HONDO = '#7fa6b4'
const TIERRA = '#a7cfb4'
const LATON = '#b8975a'
const LATON_CLARO = '#dcc48f'
const MEJILLAS = '#e3a397'

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
      <defs>
        <radialGradient id="mascota-mar" cx="36%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#e6f1f3" />
          <stop offset="45%" stopColor={MAR} />
          <stop offset="100%" stopColor={MAR_HONDO} />
        </radialGradient>
      </defs>

      {/* Pie de latón. */}
      <path d="M40 106 Q60 96 80 106 Z" fill={LATON} stroke={TINTA} strokeWidth="2" strokeLinejoin="round" />
      <rect x="57" y="90" width="6" height="11" fill={LATON} stroke={TINTA} strokeWidth="2" />

      {/* Meridiano de latón: medio aro inclinado detrás del globo. */}
      <path d="M30 18 A44 44 0 0 1 92 88" fill="none" stroke={TINTA} strokeWidth="7" strokeLinecap="round" />
      <path d="M30 18 A44 44 0 0 1 92 88" fill="none" stroke={LATON_CLARO} strokeWidth="3.5" strokeLinecap="round" />

      {/* Globo: mar con contorno. */}
      <circle cx="58" cy="52" r="38" fill="url(#mascota-mar)" stroke={TINTA} strokeWidth="3" />

      {/* Continentes. */}
      <g fill={TIERRA} stroke={TINTA} strokeWidth="2" strokeLinejoin="round">
        <path d="M30 34 C36 24 50 22 54 30 C57 36 48 40 44 44 C40 48 32 46 30 40 Z" />
        <path d="M74 22 C84 22 92 32 90 42 C86 44 80 38 76 36 C70 34 68 26 74 22 Z" />
        <path d="M80 68 C86 64 93 66 91 74 C88 81 79 83 77 77 C75 73 77 70 80 68 Z" />
        <path d="M28 66 C32 62 38 66 36 72 C34 76 28 76 26 72 Z" />
      </g>

      {/* Brillo de la lámpara. */}
      <ellipse cx="44" cy="30" rx="12" ry="7" fill="#ffffff" opacity="0.45" transform="rotate(-30 44 30)" />

      {/* Ojos. */}
      <circle cx="46" cy="50" r="5" fill={TINTA} />
      <circle cx="70" cy="50" r="5" fill={TINTA} />
      <circle cx="47.6" cy="48.4" r="1.6" fill="#ffffff" />
      <circle cx="71.6" cy="48.4" r="1.6" fill="#ffffff" />

      {/* Expresión según el humor. */}
      {tipo === 'positivo' && (
        <>
          <ellipse cx="37" cy="59" rx="5.5" ry="3.2" fill={MEJILLAS} opacity="0.85" />
          <ellipse cx="79" cy="59" rx="5.5" ry="3.2" fill={MEJILLAS} opacity="0.85" />
          <path d="M49 59 Q58 72 67 59 Z" fill={TINTA} stroke={TINTA} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )}
      {(tipo === 'neutro' || tipo === 'sinDatos') && (
        <path d="M51 64 L65 64" fill="none" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
      )}
      {tipo === 'negativo' && (
        <>
          <path d="M39 40 L50 44" stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
          <path d="M77 40 L66 44" stroke={TINTA} strokeWidth="3" strokeLinecap="round" />
          <path d="M50 69 Q58 60 66 69" fill="none" stroke={TINTA} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M78 55 q4 8 0 11 q-4 -3 0 -11 Z" fill="#e6f1f3" stroke={TINTA} strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}
