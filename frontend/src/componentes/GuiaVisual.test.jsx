// Pruebas de las ayudas "?" (HU-DASH-004-v2) y de la escala de humor (HU-DASH-004).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { posicionEnEscala } from '../utilidades/humor.js'
import EscalaHumor from './EscalaHumor.jsx'
import Ayuda from './Ayuda.jsx'
import AyudaPasos from './AyudaPasos.jsx'

const PASOS = [
  { titulo: 'Paso uno', texto: 'Primero esto.' },
  { titulo: 'Paso dos', texto: 'Después esto.' },
]

describe('Ayuda', () => {
  it('describe al botón "?" y se abre y cierra al tocarlo, con Escape o tocando fuera', async () => {
    render(
      <div>
        <p>Fuera</p>
        <Ayuda titulo="Cobertura">Cuántas noticias tienen humor.</Ayuda>
      </div>,
    )
    const boton = screen.getByRole('button', { name: 'Ayuda: Cobertura' })
    expect(boton).toHaveAccessibleDescription('Cobertura Cuántas noticias tienen humor.')
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(boton.parentElement).toHaveClass('ayuda-abierta')
    await userEvent.keyboard('{Escape}')
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(boton)
    await userEvent.click(screen.getByText('Fuera'))
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('muestra varios puntos con AyudaPasos', () => {
    render(
      <Ayuda titulo="Parámetros">
        <AyudaPasos pasos={PASOS} />
      </Ayuda>,
    )
    expect(screen.getByRole('button', { name: 'Ayuda: Parámetros' })).toHaveAccessibleDescription(
      'Parámetros Paso uno. Primero esto. Paso dos. Después esto.',
    )
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
