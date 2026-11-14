import { describe, expect, it } from 'vitest'
import { caritaComoTexto, datoDeLaFecha, diaDestacado, fechaLegible, formatoHumor, tipoHumor } from './humor.js'

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
