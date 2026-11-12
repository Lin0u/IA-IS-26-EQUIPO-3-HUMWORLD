import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { obtenerNoticia, obtenerNoticias, obtenerPaises } from '../api/cliente.js'
import ListadoNoticias from './ListadoNoticias.jsx'

vi.mock('../api/cliente.js', () => ({ obtenerNoticia: vi.fn(), obtenerNoticias: vi.fn(), obtenerPaises: vi.fn() }))

function noticia(id, valor, extra = {}) {
  return {
    id,
    titulo: `Noticia ${id}`,
    enlace_original: `https://example.test/${id}`,
    canal: 'Canal',
    continente: 'América',
    pais: 'Chile',
    categoria_iptc: '11000000',
    fecha_publicacion: '2026-10-02T09:15:00',
    fecha_registro: '2026-10-02T10:00:00',
    valor_humor: valor,
    ...extra,
  }
}

beforeEach(() => {
  obtenerNoticias.mockReset().mockResolvedValue({
    items: [noticia(1, -4.5), noticia(2, 2, { pais: null, categoria_iptc: null })],
    pagina: 1,
    tamanio_pagina: 10,
    total: 25,
  })
  obtenerPaises.mockReset().mockResolvedValue(['Chile'])
})

describe('ListadoNoticias', () => {
  it('muestra cada noticia con su humor, enlace y datos', async () => {
    render(<ListadoNoticias />)

    const enlace = await screen.findByRole('link', { name: 'Noticia 1' })
    expect(enlace).toHaveAttribute('href', 'https://example.test/1')
    expect(enlace).toHaveAttribute('target', '_blank')

    const primera = enlace.closest('li')
    expect(within(primera).getByText('-4.5')).toHaveClass('texto-negativo')
    expect(within(primera).getByText('Chile, América')).toBeInTheDocument()
    expect(within(primera).getByText('Política')).toBeInTheDocument()

    const segunda = screen.getByRole('link', { name: 'Noticia 2' }).closest('li')
    expect(within(segunda).getByText('América')).toBeInTheDocument()
    expect(within(segunda).getByText('+2.0')).toBeInTheDocument()
  })

  it('pagina y vuelve a la página 1 al cambiar un filtro', async () => {
    render(<ListadoNoticias />)
    expect(await screen.findByText('Página 1 de 3 · 25 noticias')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(obtenerNoticias).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 2 }))

    await screen.findByText('Página 2 de 3 · 25 noticias')
    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(obtenerNoticias).toHaveBeenLastCalledWith(expect.objectContaining({ pagina: 1 }))

    await screen.findByText('Página 1 de 3 · 25 noticias')
    await userEvent.click(screen.getByRole('button', { name: 'Negativas' }))
    expect(obtenerNoticias).toHaveBeenLastCalledWith(expect.objectContaining({ signo: 'negativas', pagina: 1 }))
    expect(screen.getByRole('button', { name: 'Negativas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('filtra por continente y país', async () => {
    render(<ListadoNoticias />)
    await screen.findByText('Noticia 1')

    await userEvent.selectOptions(screen.getByLabelText('Continente'), 'América')
    await screen.findByRole('option', { name: 'Chile' })
    await userEvent.selectOptions(screen.getByLabelText('País'), 'Chile')

    expect(obtenerNoticias).toHaveBeenLastCalledWith(
      expect.objectContaining({ continente: 'América', pais: 'Chile', pagina: 1 }),
    )
  })

  it('avisa cuando no hay noticias y oculta la paginación', async () => {
    obtenerNoticias.mockResolvedValue({ items: [], pagina: 1, tamanio_pagina: 10, total: 0 })
    render(<ListadoNoticias />)
    expect(await screen.findByText('No hay noticias para este filtro.')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Páginas' })).not.toBeInTheDocument()
  })

  it('muestra la guía de lectura y la escala', async () => {
    render(<ListadoNoticias />)
    await screen.findByText('Noticia 1')
    const boton = screen.getByRole('button', { name: 'Ayuda: Cómo leer las noticias' })
    expect(boton).toHaveAccessibleDescription(expect.stringContaining('Cada tarjeta es una noticia'))
    const globo = document.getElementById(boton.getAttribute('aria-describedby'))
    expect(within(globo).getByRole('img', { name: 'Escala de humor de -10 a +10' })).toBeInTheDocument()
    expect(screen.getAllByText('negativa')[0]).toBeInTheDocument()
  })

  it('explica el valor de una noticia paso a paso y oculta la explicación', async () => {
    obtenerNoticia.mockResolvedValue({
      ...noticia(1, -3),
      metodo_calculo: 'diccionario',
      terminos: [
        { palabra: 'guerra', idioma: 'es', valor: -4 },
        { palabra: 'crisis', idioma: 'es', valor: -6 },
        { palabra: 'paz', idioma: 'es', valor: 1 },
      ],
    })
    render(<ListadoNoticias />)
    await userEvent.click(await screen.findByRole('button', { name: '¿Por qué -4.5?' }))

    expect(obtenerNoticia).toHaveBeenCalledWith(1)
    const palabras = await screen.findByRole('list', { name: 'Palabras que explican el humor' })
    expect(
      within(palabras)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['guerra -4', 'crisis -6', 'paz +1'])
    expect(screen.getByText(/^Suma:/)).toHaveTextContent('Suma: (-4) + (-6) + 1 = -9')
    expect(screen.getByText(/^Promedio:/)).toHaveTextContent('Promedio: -9 ÷ 3 palabras = -3.0')
    expect(screen.getByRole('img', { name: 'Escala de humor de -10 a +10. Esta noticia: -3.0' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ocultar explicación' }))
    expect(screen.queryByRole('list', { name: 'Palabras que explican el humor' })).not.toBeInTheDocument()
  })

  it('aclara cuando el humor lo calculó el modelo de ML', async () => {
    obtenerNoticia.mockResolvedValue({
      ...noticia(1, -4.5),
      metodo_calculo: 'ml',
      terminos: [{ palabra: 'war', idioma: 'en', valor: -4 }],
    })
    render(<ListadoNoticias />)
    await userEvent.click(await screen.findByRole('button', { name: '¿Por qué -4.5?' }))
    expect(await screen.findByText('Cálculo con el modelo de ML')).toBeInTheDocument()
    expect(screen.queryByText(/^Promedio:/)).not.toBeInTheDocument()
  })

  it('avisa si la noticia no tiene palabras del diccionario o si falla la carga', async () => {
    obtenerNoticia.mockResolvedValueOnce({ ...noticia(1, null), terminos: [] })
    obtenerNoticia.mockRejectedValueOnce(new Error('No se pudo conectar con el servidor.'))
    render(<ListadoNoticias />)
    await userEvent.click(await screen.findByRole('button', { name: '¿Por qué -4.5?' }))
    expect(await screen.findByText('No se encontraron palabras del diccionario en esta noticia.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '¿Por qué +2.0?' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo cargar la explicación.')
  })

  it('muestra el error de la API', async () => {
    obtenerNoticias.mockRejectedValue(new Error('El servidor respondió con el código 500.'))
    render(<ListadoNoticias />)
    expect(await screen.findByRole('alert')).toHaveTextContent('código 500')
  })
})
