import { describe, expect, it } from 'vitest'
import {
  caritaComoTexto,
  datoDeLaFecha,
  diaDestacado,
  extremosContinentes,
  fechaLegible,
  formatoHumor,
  fraseHumorMundo,
  rangoEjeHumor,
  tipoHumor,
  tramoEnEscala,
} from './humor.js'

describe('tipoHumor', () => {
  it('clasifica por signo y distingue la ausencia de datos', () => {
    expect(tipoHumor(2.5)).toBe('positivo')
    expect(tipoHumor(-0.5)).toBe('negativo')
    expect(tipoHumor(-0.1)).toBe('neutro')
    expect(tipoHumor(0.3)).toBe('neutro')
    expect(tipoHumor(0.5)).toBe('positivo')
    expect(tipoHumor(0)).toBe('neutro')
    expect(tipoHumor(null)).toBe('sinDatos')
    expect(tipoHumor(undefined)).toBe('sinDatos')
  })
})

describe('formatoHumor', () => {
  it('muestra un decimal y el signo + en los positivos', () => {
    expect(formatoHumor(1.26)).toBe('+1.3')
    expect(formatoHumor(-3)).toBe('-3.0')
    expect(formatoHumor(-0.03)).toBe('0.0')
    expect(formatoHumor(0.04)).toBe('0.0')
    expect(formatoHumor(0)).toBe('0.0')
    expect(formatoHumor(0)).toBe('0.0')
    expect(formatoHumor(null)).toBe('Sin datos')
  })
})

describe('datoDeLaFecha', () => {
  const agregado = { serie_temporal: [{ fecha: '2026-10-01', humor_promedio: 1 }] }

  it('devuelve el día pedido o null', () => {
    expect(datoDeLaFecha(agregado, '2026-10-01')).toEqual(agregado.serie_temporal[0])
    expect(datoDeLaFecha(agregado, '2026-10-02')).toBeNull()
  })
})

describe('caritaComoTexto', () => {
  it('dibuja el SVG con el color del tipo de humor', () => {
    const svg = caritaComoTexto('positivo', 30)
    expect(svg).toContain('width="30"')
    expect(svg).toContain('#2ec4a0')
  })
})

describe('diaDestacado (HU-DASH-005)', () => {
  const serie = [
    { fecha: '2026-10-26', humor_promedio: -1.7, cantidad_noticias_evaluadas: 5 },
    { fecha: '2026-10-27', humor_promedio: 2.7, cantidad_noticias_evaluadas: 2 },
    { fecha: '2026-10-28', humor_promedio: null, cantidad_noticias_evaluadas: 0 },
  ]

  it('prioriza el día bajo el mouse', () => {
    expect(diaDestacado(serie, 0, '2026-10-27')).toMatchObject({ fecha: '2026-10-26', bajoElMouse: true })
  })

  it('sin mouse, usa el día elegido o el último con humor', () => {
    expect(diaDestacado(serie, null, '2026-10-26')).toMatchObject({ fecha: '2026-10-26', bajoElMouse: false })
    expect(diaDestacado(serie, null, '2026-01-01')).toMatchObject({ fecha: '2026-10-27' })
    expect(diaDestacado([{ fecha: '2026-10-28', humor_promedio: null }], null, null)).toMatchObject({
      fecha: '2026-10-28',
    })
  })

  it('devuelve null con la serie vacía', () => {
    expect(diaDestacado([], null, null)).toBeNull()
    expect(diaDestacado(null, 0, null)).toBeNull()
  })

  it('formatea la fecha sin desfase de zona horaria', () => {
    expect(fechaLegible('2026-10-27')).toMatch(/27/)
    expect(fechaLegible('2026-10-27')).toMatch(/2026/)
  })
})

describe('extremosContinentes y tramoEnEscala (HU-DASH-005)', () => {
  it('elige el continente más positivo y el más negativo, sin contar los vacíos', () => {
    const { masPositivo, masNegativo } = extremosContinentes([
      { nombre: 'América', humor: -2.4 },
      { nombre: 'Asia', humor: 0.6 },
      { nombre: 'Oceanía', humor: null },
    ])
    expect(masPositivo.nombre).toBe('Asia')
    expect(masNegativo.nombre).toBe('América')
    expect(extremosContinentes([{ nombre: 'Europa', humor: null }])).toEqual({ masPositivo: null, masNegativo: null })
  })

  it('arma el tramo desde el 0 hasta el valor', () => {
    expect(tramoEnEscala(5)).toEqual({ izquierda: 50, ancho: 25 })
    expect(tramoEnEscala(-5)).toEqual({ izquierda: 25, ancho: 25 })
    expect(tramoEnEscala(null)).toEqual({ izquierda: 50, ancho: 0 })
  })
})

describe('rangoEjeHumor (HU-DASH-001-v4)', () => {
  it('cubre como mínimo de -3 a +3 cuando los datos caben', () => {
    expect(rangoEjeHumor([-0.4, 1.2, 2.9])).toEqual({ min: -3, max: 3 })
  })

  it('se adapta a los datos que salen del rango mínimo, con enteros', () => {
    expect(rangoEjeHumor([-3.4, 0.5, 2.7])).toEqual({ min: -4, max: 3 })
    expect(rangoEjeHumor([1, 5.2])).toEqual({ min: -3, max: 6 })
  })

  it('siempre incluye el 0 aunque todos los valores tengan el mismo signo', () => {
    const { min, max } = rangoEjeHumor([4.1, 6.3])
    expect(min).toBeLessThan(0)
    expect(max).toBeGreaterThan(0)
  })

  it('no se sale de la escala de -10 a +10 e ignora los días sin humor', () => {
    expect(rangoEjeHumor([-12, null, 11])).toEqual({ min: -10, max: 10 })
    expect(rangoEjeHumor([null, undefined])).toEqual({ min: -3, max: 3 })
    expect(rangoEjeHumor([])).toEqual({ min: -3, max: 3 })
  })
})

describe('fraseHumorMundo (HU-DASH-005, decisión 12)', () => {
  it('usa la misma clasificación que las caritas', () => {
    expect(fraseHumorMundo(2.4)).toBe('El mundo está de buen humor')
    expect(fraseHumorMundo(-0.1)).toBe('El mundo está neutro')
    expect(fraseHumorMundo(-0.5)).toBe('El mundo está de mal humor')
    expect(fraseHumorMundo(null)).toBe('Sin noticias evaluadas ese día')
  })
})
