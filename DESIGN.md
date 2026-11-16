---
name: HumWorld
description: El humor de las noticias del mundo sobre un globo de escritorio iluminado.
colors:
  papel: "#e8edeb"
  papel-hondo: "#dde4e1"
  luz: "#f7f9f8"
  superficie: "#ffffff"
  globo: "#f5f8f7"
  tinta: "#2a3a44"
  texto-suave: "#56666e"
  linea: "#d6dedb"
  linea-fuerte: "#b3c0bc"
  acento: "#3f6f80"
  activo: "#e3edee"
  laton: "#b8975a"
  laton-texto: "#7d6230"
  mar: "#a9c4cf"
  humor-positivo: "#8fc2a7"
  humor-neutro: "#e3c27d"
  humor-negativo: "#d98a7d"
  humor-sin-datos: "#cfd7d4"
  texto-positivo: "#2f7556"
  texto-neutro: "#7d6020"
  texto-negativo: "#a8503f"
typography:
  display:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "96px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: 1.15
  title:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1.2
  nombre:
    fontFamily: "Young Serif, Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "0.1em"
rounded:
  sm: "8px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
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
    padding: "18px"
  globe-label:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
---

# Design System: HumWorld

## Overview

**Creative North Star: "El globo de escritorio"**

HumWorld se mira como un globo terráqueo sobre un escritorio, bajo la luz de una lámpara. El mundo aparece en una esfera real (d3-geo), con meridiano y pie de latón; cada país toma el color apagado del humor de su continente. Alrededor, un escritorio claro y módulos blancos en capas con sombras suaves: nada de bandas oscuras ni contrastes bruscos.

La voz tipográfica combina una serif cálida (Young Serif) para títulos, frases y nombres de continentes con una sans redonda (Figtree) para cifras y controles. El color fuerte se reserva para el humor, y aun así en tonos apagados: terracota, arena y salvia. El latón marca lo que está en foco o elegido.

**Key Characteristics:**
- Luz de lámpara: un brillo suave arriba sobre el escritorio claro.
- Globo con contornos reales, meridiano de latón y etiquetas que giran con él.
- Colores del humor apagados, con versiones oscuras para las cifras.
- Young Serif para lo que se lee como nombre; Figtree para cifras y controles.
- Latón para foco y selección.

## Colors

Neutros verdosos y fríos de escritorio, mar azul gris y latón; el humor en tonos de tierra.

### Primary
- **Azul petróleo** (acento): botón principal y filtros activos.
- **Latón** (laton): meridiano del globo, foco del teclado, pestaña y continente elegidos.

### Tertiary
- **Terracota, arena y salvia** (humor-negativo, humor-neutro, humor-positivo): países del globo, caritas, tramos de barras. Sus versiones oscuras (texto-*) para cifras y textos.

### Neutral
- **Escritorio** (papel) con la **luz** (luz) arriba; **módulo** (superficie) blanco.
- **Tinta** (tinta) para texto; **texto suave** (texto-suave) para notas y etiquetas.
- **Filete** (linea) y **filete fuerte** (linea-fuerte).

### Named Rules
**The Muted-Mood Rule.** El humor se pinta en terracota, arena y salvia; nunca en rojo o verde puros.
**The Brass-Is-Focus Rule.** El latón marca foco o selección, o es el metal del globo; nada más.

## Typography

**Display Font:** Figtree 800 (cifras grandes)
**Body Font:** Figtree (con system-ui)
**Label/Mono Font:** Young Serif para títulos y nombres

**Character:** Una serif cálida de cartela de globo junto a una sans redonda y clara para leer cifras.

### Hierarchy
- **Display** (Figtree 800, 96px): el humor del mundo.
- **Headline** (Young Serif, 32px): títulos de vista y la frase del humor.
- **Title** (Young Serif, 26px): títulos de sección.
- **Nombre** (Young Serif, 15 a 19px): continentes, palabras de la nube y medios.
- **Body** (Figtree 400, 15px, 1.55).
- **Label** (Figtree 700, 12px, 0.1em, mayúsculas).

### Named Rules
**The No-Fake-Weights Rule.** Young Serif tiene un solo peso y no tiene itálica: `font-synthesis: none` impide que el navegador los invente.

## Layout

Mapa: tres columnas (lectura del día, globo de hasta 560 px y catálogo de continentes) dentro de 1360 px; bajo 1100 px el globo baja a su propia fila y bajo 760 px todo va en una columna. Las demás vistas usan un contenedor de 1160 px con el título en serif sobre el escritorio. Ritmo de 4/8/16/24/40 px.

## Elevation & Depth

Capas suaves: los módulos flotan apenas sobre el escritorio y el globo tiene sombra en el pie, brillo de lámpara y sombreado en el borde.

### Shadow Vocabulary
- **Módulo** (`box-shadow: 0 1px 2px rgba(42, 58, 68, 0.05), 0 6px 18px rgba(42, 58, 68, 0.07)`).
- **Etiqueta del globo** (`box-shadow: 0 4px 12px rgba(42, 58, 68, 0.14)`).
- **Elevado** (`box-shadow: 0 18px 40px rgba(42, 58, 68, 0.18)`): menú lateral y globos de ayuda.

## Shapes

Esquinas amables: 12 px en módulos y botones, 8 px en campos y elementos chicos, píldora en las etiquetas del globo. Círculos para el globo, caritas y ayudas "?".

## Components

### Buttons
- **Primary:** azul petróleo plano, texto blanco, 38 px de alto, 12 px de esquina.
- **Danger:** terracota oscuro para Eliminar, Desactivar y Purgar.
- **Secondary:** blanco con filete fuerte.

### Cards / Containers
- **Módulo:** blanco, filete fino, 12 px, sombra suave en capas.

### Inputs / Fields
- **Style:** blanco, filete fuerte, 8 px. **Focus:** contorno de latón de 2 px.

### Navigation
- **Cabecera** clara con la mascota (globo de escritorio), el humor del mundo y ☰ en todas las anchuras; menú lateral blanco desde la derecha con la vista actual marcada en latón.
- **Pestañas:** subrayado de latón en la elegida.

### Globo (signature)
Globo ortográfico de d3-geo con países de Natural Earth 1:110m pintados por el humor de su continente, gratícula blanca tenue, brillo de lámpara, meridiano y pie de latón. Las etiquetas de los 5 continentes son botones en píldora; las del otro lado se muestran en el borde, más tenues. Al elegir un continente el globo gira con una curva suave (900 ms; sin animar con `prefers-reduced-motion`) y los demás se atenúan.

### Catálogo de continentes
Lista ordenada de más positivo a más negativo: carita, nombre en serif, noticias y cifra; el elegido lleva filete de latón.

## Do's and Don'ts

### Do:
- **Do** pintar el humor en terracota, arena y salvia.
- **Do** usar Young Serif solo en su peso regular.
- **Do** dar a cada módulo filete fino y sombra suave.

### Don't:
- **Don't** usar bandas oscuras ni azul noche (reemplazados en HU-DASH-005-v3).
- **Don't** usar rojo o verde saturados para el humor.
- **Don't** usar el latón para algo que no sea foco, selección o el metal del globo.
