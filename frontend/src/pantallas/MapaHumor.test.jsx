// Pruebas de la vista "Mapa de humor" en el mundo «Globo de escritorio»
// (HU-DASH-005-v3): lectura del día, catálogo ordenado por humor, etiquetas de
// los continentes en el globo y foco que atenúa los demás. El gráfico de
// evolución se reemplaza por un doble.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MapaHumor from './MapaHumor.jsx'

vi.mock('../componentes/GraficoEvolucion.jsx', () => ({ default: () => null }))

const MAPA = {
  fecha: '2026-11-16',
  fecha_minima_con_datos: '2026-10-01',
  fecha_maxima_con_datos: '2026-11-16',
  global: { humor_promedio: -0.1, cantidad_noticias_evaluadas: 95 },
  continentes: [
    { continente: 'América', humor_promedio: -0.9, cantidad_noticias_evaluadas: 4 },
    { continente: 'Europa', humor_promedio: -0.8, cantidad_noticias_evaluadas: 44 },
    { continente: 'Asia', humor_promedio: 1.1, cantidad_noticias_evaluadas: 12 },
    { continente: 'África', humor_promedio: 0.7, cantidad_noticias_evaluadas: 28 },
    { continente: 'Oceanía', humor_promedio: null, cantidad_noticias_evaluadas: 0 },
  ],
}

function dibujar() {
  render(<MapaHumor mapa={MAPA} cargando={false} error={null} alCambiarFecha={() => {}} />)
}

describe('MapaHumor (HU-DASH-005-v3)', () => {
  it('muestra el humor del mundo con su frase y sus noticias', () => {
    dibujar()
    const resumen = screen.getByRole('group', { name: 'Resumen del día' })
    expect(within(resumen).getByText('-0.1')).toBeInTheDocument()
    expect(within(resumen).getByText('El mundo está neutro')).toBeInTheDocument()
    expect(within(resumen).getByText(/95 noticias evaluadas en 4 continentes/)).toBeInTheDocument()
  })

  it('ordena el catálogo del más positivo al más negativo, sin datos al final', () => {
    dibujar()
    const catalogo = screen.getByRole('complementary', { name: 'Continentes' })
    const nombres = within(catalogo)
      .getAllByRole('button')
      .map((boton) => boton.querySelector('.continente-nombre').textContent)
    expect(nombres).toEqual(['Asia', 'África', 'Europa', 'América', 'Oceanía'])
  })

  it('el globo muestra una etiqueta por cada uno de los 5 continentes', () => {
    dibujar()
    expect(screen.getByRole('img', { name: /Globo terráqueo/ })).toBeInTheDocument()
    for (const nombre of ['América', 'Europa', 'Asia', 'África', 'Oceanía']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${nombre}:`) })).toBeInTheDocument()
    }
  })

  it('al enfocar un continente del catálogo atenúa los demás y lo marca', async () => {
    dibujar()
    const catalogo = screen.getByRole('complementary', { name: 'Continentes' })
    const botones = within(catalogo).getAllByRole('button')
    await userEvent.hover(botones[0])
    expect(botones[0]).toHaveAttribute('aria-pressed', 'true')
    expect(botones[1].closest('li')).toHaveClass('continente-atenuado')
    expect(screen.getByRole('button', { name: /^Europa:/ })).toHaveClass('globo-etiqueta-atenuada')
    expect(screen.getByRole('button', { name: /^Asia:/ })).not.toHaveClass('globo-etiqueta-atenuada')

    await userEvent.unhover(catalogo)
    expect(botones[1].closest('li')).not.toHaveClass('continente-atenuado')
  })

  it('explica los cuatro colores en la leyenda', () => {
    dibujar()
    const leyenda = screen.getByRole('list', { name: 'Significado de los colores' })
    for (const tipo of ['Negativo', 'Neutro', 'Positivo', 'Sin datos']) {
      expect(within(leyenda).getByText(tipo)).toBeInTheDocument()
    }
  })
})
