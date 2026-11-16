// Pruebas del gráfico de evolución (HU-DASH-001-v4): eje adaptable que incluye el 0
// y cubre al menos de -3 a +3. Chart.js se reemplaza por un doble que guarda las
// opciones recibidas, y la API se simula con un mock.
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerSerieGlobal } from '../api/cliente.js'
import GraficoEvolucion from './GraficoEvolucion.jsx'

const recibido = vi.hoisted(() => ({ opciones: null, datos: null }))

vi.mock('../api/cliente.js', () => ({ obtenerSerieGlobal: vi.fn() }))
vi.mock('react-chartjs-2', () => ({
  Line: ({ data, options }) => {
    recibido.datos = data
    recibido.opciones = options
    return <canvas aria-label="Gráfico de evolución del humor global" />
  },
}))

function serie(valores) {
  return valores.map((humor, indice) => ({
    fecha: `2026-11-${String(indice + 10).padStart(2, '0')}`,
    humor_promedio: humor,
    cantidad_noticias_evaluadas: humor === null ? 0 : 5,
  }))
}

async function dibujar(valores) {
  obtenerSerieGlobal.mockResolvedValue({ serie_temporal: serie(valores) })
  render(<GraficoEvolucion primeraFecha="2026-11-01" ultimaFecha="2026-11-15" fechaElegida="2026-11-15" />)
  await screen.findByLabelText('Gráfico de evolución del humor global')
  return recibido.opciones.scales.y
}

describe('GraficoEvolucion: eje vertical (HU-DASH-001-v4)', () => {
  beforeEach(() => {
    recibido.opciones = null
    obtenerSerieGlobal.mockReset()
  })

  it('usa el rango mínimo de -3 a +3 cuando los datos caben en él', async () => {
    const eje = await dibujar([-0.4, 1.1, null, 2.2])
    expect(eje.min).toBe(-3)
    expect(eje.max).toBe(3)
  })

  it('se adapta a los datos que salen del rango mínimo', async () => {
    const eje = await dibujar([-3.4, 0.5, 2.7])
    expect(eje.min).toBe(-4)
    expect(eje.max).toBe(3)
  })

  it('incluye el 0 aunque todos los días sean positivos', async () => {
    const eje = await dibujar([4.2, 6.3])
    expect(eje.min).toBeLessThanOrEqual(0)
    expect(eje.max).toBe(7)
  })

  it('dibuja un punto por fecha y deja sin valor los días sin humor', async () => {
    await dibujar([1, null, -1])
    expect(recibido.datos.labels).toHaveLength(3)
    expect(recibido.datos.datasets[0].data).toEqual([1, null, -1])
  })
})
