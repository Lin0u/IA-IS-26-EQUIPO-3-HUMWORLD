// Pruebas de la vista "Mapa de humor" en el mundo «Carta celeste» (HU-DASH-005-v2):
// lecturas del día, frase del humor global, catálogo de continentes y foco que
// atenúa los demás. Leaflet y el gráfico se reemplazan por dobles simples.
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MapaHumor from './MapaHumor.jsx'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="mapa">{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  ZoomControl: () => null,
  Tooltip: ({ children }) => <span>{children}</span>,
  Marker: ({ icon, children }) => (
    <div data-testid="astro" className={icon.options.className} data-alto={icon.options.iconSize[1]}>
      {children}
    </div>
  ),
}))
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
  ],
}

function dibujar() {
  render(<MapaHumor mapa={MAPA} cargando={false} error={null} alCambiarFecha={() => {}} />)
}

describe('MapaHumor (HU-DASH-005-v2)', () => {
  it('muestra el humor global con su frase y los continentes extremos', () => {
    dibujar()
    const resumen = screen.getByRole('list', { name: 'Resumen del día' })
    expect(within(resumen).getByText('-0.1')).toBeInTheDocument()
    expect(within(resumen).getByText('El mundo está neutro')).toBeInTheDocument()
    expect(within(resumen).getByText('Asia')).toBeInTheDocument()
    expect(within(resumen).getByText('América')).toBeInTheDocument()
  })

  it('dibuja el astro más grande para el continente con más noticias', () => {
    dibujar()
    const altos = screen.getAllByTestId('astro').map((astro) => Number(astro.dataset.alto))
    // Orden de los datos: América (4), Europa (44), Asia (12).
    expect(altos[1]).toBeGreaterThan(altos[2])
    expect(altos[2]).toBeGreaterThan(altos[0])
  })

  it('al enfocar un continente del catálogo atenúa los demás', async () => {
    dibujar()
    const catalogo = screen.getByRole('complementary', { name: 'Catálogo de continentes' })
    const filas = within(catalogo).getAllByRole('listitem')
    await userEvent.hover(filas[2])
    expect(filas[0]).toHaveClass('continente-atenuado')
    expect(filas[1]).toHaveClass('continente-atenuado')
    expect(filas[2]).not.toHaveClass('continente-atenuado')
    const astros = screen.getAllByTestId('astro')
    expect(astros[0]).toHaveClass('astro-atenuado')
    expect(astros[2]).not.toHaveClass('astro-atenuado')

    await userEvent.unhover(filas[2])
    expect(filas[0]).not.toHaveClass('continente-atenuado')
  })

  it('explica el tamaño y el color de los astros en la leyenda', () => {
    dibujar()
    expect(screen.getByText('Tamaño = noticias')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Color del astro' })).toBeInTheDocument()
  })
})
