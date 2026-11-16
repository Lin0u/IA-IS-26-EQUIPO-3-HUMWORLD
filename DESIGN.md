---
name: HumWorld
description: El humor de las noticias del mundo, leído como una carta celeste.
colors:
  noche: "#0f1b33"
  noche-alta: "#1a2a4a"
  noche-texto: "#c9d6e6"
  tinta: "#14213d"
  papel: "#eef2f6"
  papel-hondo: "#e3e9f0"
  superficie: "#ffffff"
  linea: "#d3dde8"
  linea-fuerte: "#9fb3c8"
  texto-suave: "#4a5d7a"
  acento: "#24477e"
  estrella: "#f2c14e"
  humor-positivo: "#2e9e78"
  humor-neutro: "#e0a526"
  humor-negativo: "#d64545"
  humor-sin-datos: "#c9d5e2"
  texto-positivo: "#1b7457"
  texto-neutro: "#7d5a06"
  texto-negativo: "#b02f2f"
typography:
  display:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "44px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.2
  astro:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.acento}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
    height: "38px"
  button-danger:
    backgroundColor: "{colors.texto-negativo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.md}"
  module:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.md}"
    padding: "16px 20px"
  frame-bar:
    backgroundColor: "{colors.noche}"
    textColor: "{colors.superficie}"
    height: "64px"
---

# Design System: HumWorld

## Overview

**Creative North Star: "La carta celeste"**

HumWorld se lee como un atlas del cielo puesto sobre el mundo: cada continente es un astro cuyo tamaño dice cuántas noticias tiene y cuyo color dice su humor. Un marco azul noche sostiene la aplicación; el trabajo ocurre sobre papel de atlas claro, en módulos blancos separados por filetes finos. La densidad es la de una herramienta de consulta: cifras grandes y tabulares, nombres propios en itálica de atlas y nada de ornamento que no explique un dato.

El sistema reemplaza al tablero anterior de degradados, vidrio difuminado y tarjetas flotantes (HU-DASH-005-v2). En el mapa solo el humor tiene color: las teselas van desaturadas y una gratícula de 30° ordena la superficie.

**Key Characteristics:**
- Marco azul noche plano; trabajo en papel claro y blanco.
- Módulos contiguos con filete de 1 px en lugar de tarjetas con sombra.
- Astros: tamaño = noticias, color = humor, con leyenda de magnitudes.
- Itálica de atlas para continentes, países y medios.
- Oro estelar reservado para foco y selección.

## Colors

Neutros fríos de atlas con un solo marco oscuro; el color fuerte pertenece al humor.

### Primary
- **Azul noche** (noche): cabecera, banda de cada vista y menú lateral. Nunca en el área de trabajo.
- **Azul atlas** (acento): botón principal, filtro activo, enlaces.

### Secondary
- **Oro estelar** (estrella): anillo de foco y selección; ningún otro uso.

### Tertiary
- **Rojo, ámbar y verde del humor** (humor-negativo, humor-neutro, humor-positivo): rellenos de astros, caritas y tramos; sus versiones oscuras (texto-*) para cifras.

### Neutral
- **Tinta** (tinta): texto principal y bordes fuertes.
- **Papel de atlas** (papel): fondo de página. **Superficie** (superficie): módulos.
- **Filete** (linea) y **filete fuerte** (linea-fuerte): divisores, bordes de campos, gratícula.
- **Texto suave** (texto-suave): etiquetas y notas.

### Named Rules
**The Only-Mood-Colors Rule.** En el mapa y en las cifras, el único color saturado es el del humor; la base cartográfica es gris.
**The Gold-Is-Focus Rule.** El oro estelar marca foco o selección y nada más.

## Typography

**Display Font:** Public Sans (con system-ui)
**Body Font:** Public Sans (con system-ui)
**Label/Mono Font:** Spectral itálica para nombres propios

**Character:** Una sans pública y sobria para leer cifras y controles, con la itálica de atlas como única voz expresiva.

### Hierarchy
- **Display** (800, 44px, 1.1): el humor global.
- **Headline** (800, 32px, 1.15): título de cada vista, en blanco sobre la banda.
- **Title** (800, 22px): títulos de sección, como la evolución.
- **Astro** (Spectral itálica 600, 18 a 26px): continentes, países y medios.
- **Body** (400, 15px, 1.55): texto y controles.
- **Label** (700, 12px, 0.08em, mayúsculas): etiquetas de módulos y de catálogo.

### Named Rules
**The Tabular Rule.** Toda cifra se compone con números tabulares.

## Layout

Banda azul noche de borde a borde con título, controles y, en el mapa, la fila de lecturas. El mapa ocupa todo el ancho (hasta 620 px de alto) con paneles encima: catálogo a la izquierda, leyenda arriba a la derecha y escala abajo. Por debajo de 700 px los paneles pasan bajo el mapa, las lecturas van en dos columnas y los astros se reducen. Ritmo de 4/8/16/24/32 px.

## Elevation & Depth

Sistema plano: la profundidad la dan los filetes y el contraste entre marco y papel. Los paneles sobre el mapa llevan una sombra suave para separarse de la cartografía.

### Shadow Vocabulary
- **Módulo** (`box-shadow: 0 1px 2px rgba(15, 27, 51, 0.06)`): reposo.
- **Panel sobre el mapa** (`box-shadow: 0 4px 14px rgba(15, 27, 51, 0.1)`): catálogo, leyenda y escala.
- **Elevado** (`box-shadow: 0 10px 28px rgba(15, 27, 51, 0.2)`): menú lateral y globos.

## Shapes

Esquinas contenidas: 6 px en módulos, paneles y botones; 4 px en etiquetas y valores. Círculos solo para astros, caritas, ayudas "?" y la mascota.

## Components

### Buttons
- **Shape:** esquinas de 6 px, 38 px de alto.
- **Primary:** azul atlas plano con texto blanco; hover más oscuro.
- **Danger:** rojo del humor oscuro para Eliminar, Desactivar y Purgar.
- **Secondary:** blanco con filete fuerte.

### Cards / Containers
- **Módulo:** blanco, filete de 1 px, 6 px de esquina, 16 a 20 px de relleno. Las lecturas del mapa van contiguas, separadas por filetes, con un filete de color de 3 px arriba según el humor.

### Inputs / Fields
- **Style:** blanco, filete fuerte, 6 px. **Focus:** contorno oro estelar de 2 px.

### Navigation
- **Cabecera** azul noche de 64 px con la mascota, el humor del mundo y ☰ en todas las anchuras; menú lateral azul noche desde la derecha, con la vista actual marcada por un filete de oro estelar.
- **Pestañas** (Administración y filtros de signo): texto claro sobre la banda; la elegida, subrayada en oro estelar.

### Listas
- **Noticias:** un solo módulo con filas separadas por filete; a la izquierda, franja de 4 px y la carita con la cifra del humor; el medio en itálica de atlas y "Medio de <país>, <continente>".
- **Nube y ranking:** palabras en itálica de atlas con el color de su humor; la palabra elegida lleva anillo de oro estelar.
- **Cobertura:** escala propia de azules; rojo, ámbar y verde quedan solo para el humor.

### Astro (signature)
Carita del humor dibujada a la escala de su magnitud (30 a 64 px, raíz cuadrada de las noticias del día) dentro de un anillo, con el valor debajo. Al enfocar un continente en el mapa o en el catálogo, los demás bajan a 30 a 35 % de opacidad.

## Do's and Don'ts

### Do:
- **Do** mostrar cada continente como astro con su leyenda de magnitudes.
- **Do** escribir continentes, países y medios en Spectral itálica.
- **Do** separar módulos con filetes de 1 px.

### Don't:
- **Don't** usar degradados, vidrio difuminado ni brillos en botones (reemplazados en HU-DASH-005-v2).
- **Don't** usar el azul noche dentro del área de trabajo.
- **Don't** usar el oro estelar para algo que no sea foco o selección.
