import { describe, expect, it } from 'vitest'
import { continenteDePunto, esVisible, PAISES, rotacionHacia, rotacionIntermedia } from './globo.js'

const continenteDe = (nombre) => PAISES.find((pais) => pais.properties.name === nombre)?.continente

describe('continenteDePunto (HU-DASH-005-v3)', () => {
  it('ubica puntos conocidos en su continente', () => {
    expect(continenteDePunto([-70, -33])).toBe('América') // Santiago
    expect(continenteDePunto([2, 48])).toBe('Europa') // París
    expect(continenteDePunto([31, 30])).toBe('África') // El Cairo
    expect(continenteDePunto([46, 24])).toBe('Asia') // Riad
    expect(continenteDePunto([151, -34])).toBe('Oceanía') // Sídney
    expect(continenteDePunto([0, -80])).toBeNull() // Antártida
  })

  it('separa África de la península arábiga por el mar Rojo', () => {
    expect(continenteDePunto([38.8, 15.4])).toBe('África') // Eritrea
    expect(continenteDePunto([47.5, 15.9])).toBe('Asia') // Yemen
  })
})

describe('PAISES', () => {
  it('asigna continente a los países del mapa', () => {
    expect(continenteDe('Chile')).toBe('América')
    expect(continenteDe('Brazil')).toBe('América')
    expect(continenteDe('Germany')).toBe('Europa')
    expect(continenteDe('Nigeria')).toBe('África')
    expect(continenteDe('Egypt')).toBe('África')
    expect(continenteDe('India')).toBe('Asia')
    expect(continenteDe('Saudi Arabia')).toBe('Asia')
    expect(continenteDe('Australia')).toBe('Oceanía')
    expect(continenteDe('New Zealand')).toBe('Oceanía')
    expect(continenteDe('Antarctica')).toBeNull()
  })
})

describe('rotación del globo', () => {
  it('deja al frente el punto pedido', () => {
    const rotacion = rotacionHacia([52, 15])
    expect(esVisible([52, 15], rotacion)).toBe(true)
    expect(esVisible([-25, 135], rotacion)).toBe(false)
  })

  it('interpola por el camino más corto y termina en el destino', () => {
    expect(rotacionIntermedia([170, 0], [-170, 10], 1)).toEqual([190, 10])
    expect(rotacionIntermedia([0, 0], [100, 20], 0)).toEqual([0, 0])
    const mitad = rotacionIntermedia([0, 0], [100, 0], 0.5)
    expect(mitad[0]).toBeGreaterThan(50)
  })
})
