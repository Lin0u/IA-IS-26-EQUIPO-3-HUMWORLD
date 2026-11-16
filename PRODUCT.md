# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primarios: docentes que evalúan la entrega final del proyecto** (UNAB, Equipo 3). Lo revisan en su laptop, de cerca y con calma. Deben entender en segundos qué mide HumWorld y cómo llega a cada número, y percibir un producto profesional y cuidado.
- Secundarios: un visitante curioso que quiere saber "cómo está el mundo hoy" y un analista que compara días, regiones y noticias.
- La PO del proyecto trabaja directamente sobre el repositorio; sus decisiones se registran en las HU (ver CLAUDE.md).

## Product Purpose

HumWorld captura noticias de medios de todo el mundo por feeds RSS, calcula el "humor" de cada noticia en una escala de -10 a +10 y lo muestra agregado por continente y día. Existe para hacer visible y auditable el tono de las noticias del mundo. El éxito es que el evaluador entienda el sistema sin ayuda externa y pueda comprobar de dónde sale cada número.

## Positioning

El humor no es una caja negra: cada valor se puede explicar hasta la palabra del diccionario que lo produjo ("¿Por qué +7.5?"), y el mismo dato se ve a escala de mundo, continente, día y noticia.

## Operating Context

- Vistas: Mapa de humor (vista principal, con evolución temporal), Nube de palabras, Noticias y Administración (Fuentes RSS, Diccionario, Parámetros, Purgado, Modelo ML).
- Las historias de usuario y ADR en `docs/` son la fuente de verdad del comportamiento; todo cambio funcional o de presentación se registra en su HU.
- Revisión en laptop personal; el celular (390 px) debe seguir funcionando.

## Capabilities and Constraints

- El frontend no calcula humor: muestra lo que entrega el backend (promedio simple de términos, ADR-003; ML opcional, ADR-004).
- Escala oficial de -10 a +10 (PDF §10.4). Neutro entre -0,5 y +0,5 (decisión de la PO del 2026-11-11).
- El continente y el país de una noticia son los del medio que la publica, no los del hecho (ADR-002); la interfaz lo dice explícitamente.
- Los 5 continentes: América, Europa, Asia, África y Oceanía.
- Interfaz en español; muchos titulares llegan en inglés y se muestran tal cual.
- Stack: React + Vite, Chart.js, Leaflet (ADR-005).

## Brand Commitments

- Nombre: HumWorld.
- La mascota es un planeta (hoy, con anillo y caras según el humor). Debe seguir siendo un planeta; su dibujo se puede mejorar.
- Decisión de la PO del 2026-11-16: el aspecto visual actual (HU-DASH-005) se reemplaza por un mundo visual nuevo, conservando funciones, datos y textos.

## Evidence on Hand

- Datos reales de la base local (cientos de noticias evaluadas, 13 canales, 22 fuentes RSS).
- No hay testimonios, métricas de uso ni logos de terceros; no se deben inventar.

## Product Principles

1. Cada número se puede explicar: del mundo al continente, a la noticia, a la palabra.
2. Entender antes que impresionar: el evaluador sabe qué está mirando en el primer vistazo.
3. Lo verdadero sobre lo cómodo: decir lo que el dato es (lugar del medio, noticias sin humor) aunque complique el relato.
4. Profesional y con oficio: elaborado sin ser recargado.

## Accessibility & Inclusion

Contraste de texto AA (4,5:1), navegación por teclado, áreas táctiles de al menos 24 px y respeto de `prefers-reduced-motion` (ya exigido en HU-DASH-005).
