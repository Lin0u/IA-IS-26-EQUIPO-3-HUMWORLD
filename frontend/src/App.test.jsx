import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerMapa } from './api/cliente.js'
import App from './App.jsx'

// El mapa (Leaflet) y las otras pantallas tienen sus propias pruebas o necesitan
// un navegador real; aquí se reemplazan por piezas simples.
vi.mock('./api/cliente.js', () => ({ obtenerMapa: vi.fn() }))
vi.mock('./pantallas/MapaHumor.jsx', () => ({
  default: ({ cargando, error, alCambiarFecha }) => (
    <div>
      <p>{cargando ? 'mapa cargando' : `mapa listo ${error ?? ''}`}</p>
      <button type="button" onClick={() => alCambiarFecha('2026-10-01')}>
        elegir fecha
      </button>
    </div>
  ),
}))
vi.mock('./pantallas/NubePalabras.jsx', () => ({ default: () => <p>pantalla nube</p> }))
vi.mock('./pantallas/ListadoNoticias.jsx', () => ({ default: () => <p>pantalla noticias</p> }))

beforeEach(() => {
  obtenerMapa.mockReset().mockResolvedValue({ global: { humor_promedio: 1.25 } })
})

describe('App', () => {
  it('muestra el humor global en la cabecera y cambia de pantalla con el menú lateral', async () => {
    render(<App />)

    expect(await screen.findByText('+1.3')).toHaveClass('texto-positivo')
    expect(screen.getByText(/mapa listo/)).toBeInTheDocument()

    // HU-DASH-005: el menú está cerrado hasta presionar ☰.
    const abrir = screen.getByRole('button', { name: 'Abrir menú' })
    expect(abrir).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Pantallas' })).not.toBeInTheDocument()

    await userEvent.click(abrir)
    const menu = screen.getByRole('navigation', { name: 'Pantallas' })
    expect(within(menu).getByRole('button', { name: 'Mapa de humor' })).toHaveAttribute('aria-current', 'page')
    expect(within(menu).getByRole('button', { name: 'Administración' })).toBeInTheDocument()
    expect(within(menu).getByRole('button', { name: 'Cerrar menú' })).toHaveFocus()

    await userEvent.click(within(menu).getByRole('button', { name: 'Nube de palabras' }))
    expect(screen.getByText('pantalla nube')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pantallas' })).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()

    await userEvent.click(abrir)
    await userEvent.click(screen.getByRole('button', { name: 'Noticias' }))
    expect(screen.getByText('pantalla noticias')).toBeInTheDocument()

    // El logo vuelve al mapa.
    await userEvent.click(screen.getByRole('button', { name: 'HumWorld: ir al mapa de humor' }))
    expect(screen.getByText(/mapa listo/)).toBeInTheDocument()
  })

  it('cierra el menú con Escape o con el botón ×', async () => {
    render(<App />)
    await screen.findByText(/mapa listo/)
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Pantallas' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }))
    expect(screen.queryByRole('navigation', { name: 'Pantallas' })).not.toBeInTheDocument()
  })

  it('vuelve a pedir el mapa al cambiar la fecha', async () => {
    render(<App />)
    await screen.findByText(/mapa listo/)

    await userEvent.click(screen.getByRole('button', { name: 'elegir fecha' }))

    expect(obtenerMapa).toHaveBeenLastCalledWith('2026-10-01')
  })

  it('pasa el error de la API al mapa', async () => {
    obtenerMapa.mockRejectedValue(new Error('sin conexión'))
    render(<App />)
    expect(await screen.findByText('mapa listo sin conexión')).toBeInTheDocument()
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
  })
})
