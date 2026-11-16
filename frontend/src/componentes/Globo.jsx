// HumWorld - globo de escritorio del mapa de humor (HU-DASH-005-v3, ADR-006).
// Globo ortográfico dibujado con d3-geo: cada país toma el color del humor de su
// continente, un meridiano de latón y un pie lo sostienen, y gira con suavidad
// hacia el continente enfocado. Se puede arrastrar para mirar el otro lado.
// No calcula humor: recibe los continentes ya calculados por el backend.
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo'
import { useEffect, useRef, useState } from 'react'
import { COLORES_HUMOR, formatoHumor, tipoHumor } from '../utilidades/humor.js'
import { esVisible, PAISES, rotacionHacia, rotacionIntermedia } from '../utilidades/globo.js'

const LADO = 560
const RADIO = 232
const CENTRO = LADO / 2
const ROTACION_INICIAL = rotacionHacia([20, 15])
const GRATICULA = geoGraticule10()

function prefiereMenosMovimiento() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

export default function Globo({ continentes, enfocado, alEnfocar }) {
  const [rotacion, setRotacion] = useState(ROTACION_INICIAL)
  const rotacionActual = useRef(ROTACION_INICIAL)
  const arrastre = useRef(null)

  // Gira hacia el continente enfocado (sin animar si se prefiere menos movimiento).
  const destino = continentes.find((continente) => continente.nombre === enfocado)?.ubicacion?.centro
  const latitudDestino = destino?.[0]
  const longitudDestino = destino?.[1]
  useEffect(() => {
    if (latitudDestino === undefined) return undefined
    const hasta = rotacionHacia([latitudDestino, longitudDestino])
    const desde = rotacionActual.current
    const duracion = prefiereMenosMovimiento() ? 0 : 900
    let cuadro
    const inicio = performance.now()
    const paso = (ahora) => {
      const t = duracion === 0 ? 1 : Math.min(1, (ahora - inicio) / duracion)
      const intermedia = rotacionIntermedia(desde, hasta, t)
      rotacionActual.current = intermedia
      setRotacion(intermedia)
      if (t < 1) cuadro = requestAnimationFrame(paso)
    }
    cuadro = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(cuadro)
  }, [latitudDestino, longitudDestino])

  const proyeccion = geoOrthographic().scale(RADIO).translate([CENTRO, CENTRO]).rotate(rotacion).clipAngle(90)
  const trazo = geoPath(proyeccion)
  const sinRecorte = geoOrthographic().scale(RADIO).translate([CENTRO, CENTRO]).rotate(rotacion)

  const humorDe = Object.fromEntries(continentes.map((continente) => [continente.nombre, continente.humor]))
  const colorPais = (continente) =>
    continente && continente in humorDe ? COLORES_HUMOR[tipoHumor(humorDe[continente])] : COLORES_HUMOR.sinDatos

  // Posición de la etiqueta de cada continente; si está del otro lado, en el borde.
  const etiquetas = continentes
    .filter((continente) => continente.ubicacion)
    .map((continente) => {
      const [latitud, longitud] = continente.ubicacion.centro
      const visible = esVisible(continente.ubicacion.centro, rotacion)
      let [x, y] = sinRecorte([longitud, latitud])
      if (!visible) {
        const dx = x - CENTRO
        const dy = y - CENTRO
        const largo = Math.hypot(dx, dy) || 1
        x = CENTRO + (dx / largo) * (RADIO + 6)
        y = CENTRO + (dy / largo) * (RADIO + 6)
      }
      return { ...continente, x, y, visible }
    })

  function empezarArrastre(evento) {
    arrastre.current = { x: evento.clientX, y: evento.clientY, rotacion: rotacionActual.current }
    evento.currentTarget.setPointerCapture?.(evento.pointerId)
  }

  function arrastrar(evento) {
    if (!arrastre.current) return
    const { x, y, rotacion: base } = arrastre.current
    const nueva = [
      base[0] + (evento.clientX - x) * 0.35,
      Math.max(-60, Math.min(60, base[1] - (evento.clientY - y) * 0.35)),
    ]
    rotacionActual.current = nueva
    setRotacion(nueva)
  }

  function soltar() {
    arrastre.current = null
  }

  return (
    <div className="globo">
      <svg
        className="globo-dibujo"
        viewBox={`0 0 ${LADO} ${LADO + 40}`}
        role="img"
        aria-label="Globo terráqueo con el humor de cada continente. Arrástralo para girarlo."
        onPointerDown={empezarArrastre}
        onPointerMove={arrastrar}
        onPointerUp={soltar}
        onPointerLeave={soltar}
      >
        <defs>
          <radialGradient id="globo-mar" cx="36%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#eef5f6" />
            <stop offset="40%" stopColor="#c3d8de" />
            <stop offset="100%" stopColor="#87a9b5" />
          </radialGradient>
          <radialGradient id="globo-sombra" cx="38%" cy="32%" r="70%">
            <stop offset="55%" stopColor="#2a3a44" stopOpacity="0" />
            <stop offset="100%" stopColor="#2a3a44" stopOpacity="0.32" />
          </radialGradient>
          <radialGradient id="globo-brillo" cx="34%" cy="26%" r="30%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="globo-laton" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d9bf87" />
            <stop offset="55%" stopColor="#b8975a" />
            <stop offset="100%" stopColor="#8c6f3a" />
          </linearGradient>
        </defs>

        {/* Pie y sombra sobre el escritorio. */}
        <ellipse cx={CENTRO} cy={LADO + 22} rx="150" ry="14" fill="#2a3a44" opacity="0.12" />
        <path
          d={`M${CENTRO - 70} ${LADO + 20} Q${CENTRO} ${LADO - 6} ${CENTRO + 70} ${LADO + 20} Z`}
          fill="url(#globo-laton)"
        />
        <rect
          x={CENTRO - 7}
          y={CENTRO + RADIO + 14}
          width="14"
          height={LADO - CENTRO - RADIO - 6}
          fill="url(#globo-laton)"
        />

        {/* Meridiano de latón, detrás del globo. */}
        <circle
          cx={CENTRO}
          cy={CENTRO}
          r={RADIO + 18}
          fill="none"
          stroke="url(#globo-laton)"
          strokeWidth="9"
          strokeDasharray={`${Math.PI * (RADIO + 18) * 1.05} ${Math.PI * (RADIO + 18)}`}
          transform={`rotate(-112 ${CENTRO} ${CENTRO})`}
        />

        <path d={trazo({ type: 'Sphere' })} fill="url(#globo-mar)" />
        <path d={trazo(GRATICULA)} fill="none" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="0.8" />
        <g className="globo-paises">
          {PAISES.map((pais) => {
            const atenuado = enfocado && pais.continente !== enfocado
            return (
              <path
                key={pais.id ?? pais.properties.name}
                d={trazo(pais) ?? ''}
                fill={colorPais(pais.continente)}
                fillOpacity={atenuado ? 0.35 : 0.95}
                stroke="#ffffff"
                strokeWidth="0.6"
              />
            )
          })}
        </g>
        <path d={trazo({ type: 'Sphere' })} fill="url(#globo-sombra)" />
        <path d={trazo({ type: 'Sphere' })} fill="url(#globo-brillo)" />
        <path d={trazo({ type: 'Sphere' })} fill="none" stroke="#2a3a44" strokeOpacity="0.35" strokeWidth="1" />
      </svg>

      {/* Etiquetas: botones que giran el globo hacia su continente. */}
      {etiquetas.map((continente) => (
        <button
          key={continente.nombre}
          type="button"
          className={[
            'globo-etiqueta',
            continente.visible ? '' : 'globo-etiqueta-detras',
            enfocado && enfocado !== continente.nombre ? 'globo-etiqueta-atenuada' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          // Dentro del dibujo: en pantallas angostas la etiqueta no se sale por los lados.
          style={{
            left: `clamp(56px, ${(continente.x / LADO) * 100}%, calc(100% - 56px))`,
            top: `${(continente.y / (LADO + 40)) * 100}%`,
          }}
          aria-label={`${continente.nombre}: ${formatoHumor(continente.humor)}, promedio de ${continente.noticias} noticias`}
          onClick={() => alEnfocar(continente.nombre)}
          onFocus={() => alEnfocar(continente.nombre)}
        >
          <span className="nombre-astro">{continente.nombre}</span>
          <strong className={`texto-${tipoHumor(continente.humor)}`}>{formatoHumor(continente.humor)}</strong>
        </button>
      ))}
    </div>
  )
}
