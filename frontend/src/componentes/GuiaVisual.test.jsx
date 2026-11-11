// Pruebas de la guía de lectura y de la escala de humor (HU-DASH-004).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { posicionEnEscala } from '../utilidades/humor.js'
import EscalaHumor from './EscalaHumor.jsx'
import GuiaPantalla from './GuiaPantalla.jsx'

const PASOS = [
  { titulo: 'Paso uno', texto: 'Primero esto.' },
  { titulo: 'Paso dos', texto: 'Después esto.' },
]

describe('GuiaPantalla', () => {
  it('muestra los pasos abiertos y se puede ocultar y volver a mostrar', async () => {
    render(
      <GuiaPantalla pasos={PASOS}>
        <p>Contenido extra</p>
      </GuiaPantalla>,
    )
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Paso unoPrimero esto.',
      'Paso dosDespués esto.',
    ])
    expect(screen.getByText('Contenido extra')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar guía' }))
    expect(screen.queryByText('Paso uno')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostrar guía' })).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(screen.getByRole('button', { name: 'Mostrar guía' }))
    expect(screen.getByText('Paso uno')).toBeInTheDocument()
  })
})

describe('EscalaHumor', () => {
  it('sin valor, muestra solo la escala', () => {
    render(<EscalaHumor />)
    expect(screen.getByRole('img', { name: 'Escala de humor de -10 a +10' })).toHaveTextContent(
      '-10-50+5+10Muy negativoNeutroMuy positivo',
    )
  })

  it('marca el valor en su posición', () => {
    render(<EscalaHumor valor={5} etiqueta="Mundo" />)
    const marca = screen.getByText('Mundo +5.0')
    expect(marca).toHaveStyle({ left: '75%' })
    expect(marca).toHaveClass('escala-marca-positivo')
  })

  it('acota los valores fuera de la escala', () => {
    expect(posicionEnEscala(-10)).toBe(0)
    expect(posicionEnEscala(0)).toBe(50)
    expect(posicionEnEscala(12)).toBe(100)
    expect(posicionEnEscala(-15)).toBe(0)
  })
})
