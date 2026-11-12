# Historias de Usuario — Módulo Dashboards y Visualización (EPIC-DASH, Sprint 3)

**Proyecto:** HumWorld — Equipo 3
**Origen:** PDF de especificaciones (`0 PROYECTO_FINAL_HUMWORLD 260821.pdf`), secciones 4.1 (Procesos principales, punto de visualización), 4.3 (Interfaces y experiencia de usuario), 4.3.1 (Dashboard de palabras influyentes), 4.3.2 (Dashboard de Humor), 6.1 (Capa de presentación) y 10.2 (Endpoints mínimos obligatorios: `/sentiment`, `/news`, `/dashboards`). Stack de la capa de presentación decidido y justificado en `ADR-005-stack-frontend-dashboards.md`.
**Estado general:** Propuesto — historias generadas a partir de los títulos ya oficializados en el backlog del entregable P3 (`Anexo-I-Planificacion-entregado-P3.md`: HU-DASH-001, HU-DASH-002 y HU-DASH-003; versiones vigentes: HU-DASH-001-v3, HU-DASH-002-v3 y HU-DASH-003-v2; se agrega HU-DASH-004) y de la estimación en puntos ya realizada en Planning Poker (Sprint 3 = 12 puntos). Pendiente de revisión crítica del equipo.
**Versión del documento:** v1.6. Ver la Tabla de control de versiones al final del documento.

> **Nota de grounding general:** el PDF exige "dashboards interactivos que visualicen el humor global y por regiones" (Objetivos específicos, punto 3) y enumera las vistas en la sección 4.3: Dashboard de humor (mapa mundial interactivo con selector de fecha), Nube de palabras (términos influyentes con filtros por país/continente) y Listado de noticias (detalle de las noticias más relevantes para el humor calculado). Este documento formaliza esas tres vistas; no agrega ninguna vista nueva. El Panel de administración (cuarta vista de la sección 4.3) pertenece a EPIC-ADMIN (HU-ADMIN-004, Sprint 4) y queda fuera de este documento.

> **Nota sobre el algoritmo de humor (sección 11 de las instrucciones del proyecto):** ninguna historia de EPIC-DASH calcula humor. La capa de presentación solo muestra valores ya calculados y persistidos por el backend: `valor_humor` por noticia (HU-SENT-002-v2, cálculo híbrido: modelo de ML cuando está disponible, o promedio simple de diccionario como fallback según HU-SENT-007 y `ADR-003-eleccion-algoritmo-agregacion-sentimiento.md`) y `humor_promedio` agregado (HU-SENT-004). Cada historia indica abajo qué valor consume.

> **Estado de implementación (2026-11-11):** las vistas están conectadas al backend real en `frontend/`: mapa y gráfico temporal (HU-DASH-001-v3), listado de noticias con la explicación de su humor (HU-DASH-002-v3), nube de palabras con filtro por continente y país (HU-DASH-003-v2) y la guía visual de lectura (HU-DASH-004). Tienen pruebas con Vitest y Testing Library que corren en el pipeline. Pendiente: ratificación del equipo y estimación en Planning Poker.

---

## HU-DASH-001-v3 — Dashboard mapa mundial de humor y evolución temporal

**Reemplaza a:** HU-DASH-001-v2 (Deprecada). **Qué cambió:** (a) el mapa obtiene sus datos de un endpoint único, `GET /api/v1/dashboards/map`, que entrega el humor global, el de los 5 continentes y el rango de fechas con información, en lugar de una llamada a `/sentiment` por continente; (b) se agrega un gráfico de evolución temporal del humor global. **Por qué:** decisiones de equipo de la sesión del 2026-10-05, que cierran los puntos pendientes 2 y 3 y dan respaldo funcional a Chart.js, aprobado en ADR-005 sin historia que lo pidiera (hallazgos H-4 y H-5 de `Revision-consistencia-EPIC-DASH-2026-10-05.md`).

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global *(PDF, sección 4.1)*,
**quiero** ver en un mapa del mundo el humor de cada continente en una fecha que yo elija dentro del rango con información disponible,
**para** identificar de un vistazo qué regiones están de mejor o peor humor y cómo cambia ese humor de un día a otro.

**Prioridad:** Alta *(es la vista principal del proyecto: PDF, sección 4.3.2)*
**Estimación (Planning Poker P3):** 5 puntos *(valor estimado en P3 para el alcance original. Esta versión agrega el gráfico de evolución temporal, por lo que el alcance creció y los 5 puntos ya no son representativos: el equipo debe reestimar la historia en Planning Poker. No se propone aquí una cifra nueva)*
**Depende de contrato de API:** Sí — (1) `GET /api/v1/dashboards/map` con parámetro de query `fecha` — ver `contrato-dashboards.openapi.yaml`, esquema `MapaHumor` (`global`, `continentes`, `fecha_minima_con_datos`, `fecha_maxima_con_datos`); (2) `GET /api/v1/sentiment` con `desde` y `hasta` (HU-SENT-004) para el gráfico temporal — ver `contrato-sentimiento-diccionario.openapi.yaml`, esquema `SentimientoAgregado`, campo `serie_temporal`.
**Valor de humor que consume:** `humor_promedio` (promedio de `valor_humor` de las noticias que cumplen el filtro), calculado por el backend. No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo** (no resueltos por este documento):
1. **Lista de continentes: resuelta; `enum` pendiente.** La lista es la confirmada por el equipo el 2026-09-28 en HU-RSS-009 (`HU-RSS-captura.md`; `contrato-canales-fuentes-rss.openapi.yaml` v1.6.0): los 5 continentes habitados — América, Europa, Asia, África y Oceanía. La maqueta, que asumía seis (América del Norte y América del Sur por separado), debe ajustarse a estos cinco. Sigue pendiente: los contratos definen `continente` como `string` libre; se recomienda convertirlo en un `enum` con esos cinco valores en ambos contratos, para que backend y frontend usen exactamente los mismos literales.
2. **Origen de los datos del mapa: resuelto.** Endpoint único `GET /api/v1/dashboards/map` (decisión de equipo, 2026-10-05), previsto por el PDF en la sección 10.2. Una sola llamada por fecha.
3. **Rango de fechas con información: resuelto.** Lo entrega el mismo endpoint en `fecha_minima_con_datos` y `fecha_maxima_con_datos`. Sigue pendiente confirmar la fecha que se muestra al abrir la vista: el contrato propone la fecha máxima con datos.
4. **Rangos de color.** La maqueta clasifica solo por signo (mayor que 0 positivo, menor que 0 negativo, igual a 0 neutro). El equipo no ha definido umbrales oficiales para "positivo", "neutro" o "negativo".

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Visualización del humor por continente en la fecha elegida
  Dado que el backend dispone de humor agregado para la fecha 2026-10-02 en los 5 continentes (América, Europa, Asia, África, Oceanía)
  Cuando el usuario abre el dashboard "Mapa de humor" con esa fecha seleccionada
  Entonces el mapa muestra exactamente 1 marcador por cada uno de los 5 continentes
  Y cada marcador muestra el humor_promedio de su continente con 1 decimal y signo explícito cuando es positivo

Escenario: Humor global de la fecha elegida
  Dado que el backend dispone de humor agregado global para la fecha seleccionada
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra el humor_promedio global con 1 decimal
  Y muestra la cantidad_noticias_evaluadas que sustenta ese valor

Escenario: Cambio de fecha dentro del rango con información
  Dado que el dashboard está mostrando la fecha 2026-10-02
  Cuando el usuario selecciona la fecha 2026-09-28, que pertenece al rango con información
  Entonces los valores de todos los marcadores y del humor global pasan a ser los de 2026-09-28
  Y la página no se recarga

Escenario: Selector de fecha limitado al rango con información
  Dado que el backend informa fecha_minima_con_datos = F_min y fecha_maxima_con_datos = F_max
  Cuando el usuario abre el selector de fecha
  Entonces el selector no permite elegir fechas anteriores a F_min ni posteriores a F_max

Escenario: Continente sin noticias evaluadas en la fecha elegida
  Dado que para un continente el backend responde humor_promedio = null y cantidad_noticias_evaluadas = 0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el marcador de ese continente muestra el texto "Sin datos"
  Y la vista no muestra ningún mensaje de error

Escenario: Clasificación visual por signo del humor
  Dado un continente con humor_promedio = +3.4, otro con -4.1 y otro con 0.0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el primero se representa como positivo, el segundo como negativo y el tercero como neutro
  Y la vista incluye una leyenda que explica las 4 representaciones (positivo, neutro, negativo, sin datos)

Escenario: Gráfico de evolución temporal del humor global
  Dado que GET /api/v1/sentiment con desde = F_min y hasta = F_max devuelve una serie_temporal con N fechas
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra un gráfico de líneas con exactamente N puntos, 1 por cada fecha de la serie
  Y el eje vertical del gráfico usa la escala fija de -10 a +10

Escenario: Fecha sin noticias evaluadas dentro de la serie temporal
  Dado que una fecha de la serie_temporal tiene humor_promedio = null
  Cuando la vista dibuja el gráfico de evolución temporal
  Entonces esa fecha no se representa con el valor 0
  Y la línea del gráfico se interrumpe en esa fecha

Escenario: El backend no responde o responde con error
  Dado que GET /api/v1/dashboards/map responde con código HTTP 500 o no responde dentro del timeout configurado
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra un mensaje de error legible para el usuario
  Y no queda la pantalla en blanco ni un indicador de carga indefinido
```

**Nota de grounding (lista de noticias en el dashboard de humor):** el PDF (sección 4.3.2) pide además que el dashboard de humor ofrezca "una lista de las noticias que más han influido en el cálculo del humor". Ese requisito se cubre con HU-DASH-002; el equipo debe confirmar si basta con que la lista esté en una vista propia accesible desde el menú (como en la maqueta) o si debe mostrarse dentro de la misma vista del mapa.

**Nota de grounding (escala):** la escala de -10 a +10 que muestra la leyenda proviene del PDF (sección 10.4) y de la sección 11 de las instrucciones del proyecto.

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto — código revisado por al menos 1 integrante vía Pull Request, pruebas unitarias con dependencias externas aisladas mediante mocks, cobertura ≥ 80% verificada en GitHub Actions, SonarQube sin issues críticos, build y despliegue con `needs: [test, sonarqube]`.) Adicionalmente:
- La vista consume `GET /api/v1/dashboards/map` y `GET /api/v1/sentiment` reales; no quedan datos de ejemplo en el camino de producción.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo al menos los 9 escenarios Gherkin anteriores. Nunca pruebas unitarias con llamadas reales al backend ni al servidor de teselas del mapa.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.
- `ADR-005-stack-frontend-dashboards.md` en estado Aceptado.
- `contrato-dashboards.openapi.yaml` aprobado por el equipo y endpoint de mapa implementado en el backend.
- Puntos pendientes 1 a 4 de esta historia resueltos y reflejados en el contrato.

---

## HU-DASH-001-v2 — Dashboard mapa mundial de humor (DEPRECADA)

> **Estado: Deprecada (2026-10-05).** Reemplazada por **HU-DASH-001-v3**. Se conserva sin cambios para trazabilidad. Motivo: dependía de una llamada a `/sentiment` por continente y no incluía el gráfico de evolución temporal.

**Reemplaza a:** HU-DASH-001 (Deprecada). **Qué cambió:** la lista de continentes pasa de 6 a los 5 ya confirmados por el equipo en HU-RSS-009; se actualizan el punto pendiente 1 y los dos escenarios Gherkin que usaban la cifra. **Por qué:** HU-DASH-001 contradecía una decisión vigente de EPIC-RSS (hallazgo H-1 de `Revision-consistencia-EPIC-DASH-2026-10-05.md`). El resto de la historia no cambia.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global *(PDF, sección 4.1)*,
**quiero** ver en un mapa del mundo el humor de cada continente en una fecha que yo elija dentro del rango con información disponible,
**para** identificar de un vistazo qué regiones están de mejor o peor humor y cómo cambia ese humor de un día a otro.

**Prioridad:** Alta *(es la vista principal del proyecto: PDF, sección 4.3.2)*
**Estimación (Planning Poker P3):** 5 puntos *(ya estimado formalmente en el Planning Poker de la Práctica P3 — ver `Anexo-I-Planificacion-entregado-P3.md`; no es un valor definitivo: el detalle de esta historia se escribió después de estimar, por lo que el equipo debe revalidar si 5 puntos sigue siendo representativo)*
**Depende de contrato de API:** Sí — `GET /api/v1/sentiment` con parámetros de query `continente`, `desde` y `hasta` (HU-SENT-004) — ver `contrato-sentimiento-diccionario.openapi.yaml`, tag `sentiment`, esquema `SentimientoAgregado` (`humor_promedio`, `cantidad_noticias_evaluadas`, `serie_temporal`).
**Valor de humor que consume:** `humor_promedio` (promedio de `valor_humor` de las noticias que cumplen el filtro), calculado por el backend. No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo** (no resueltos por este documento):
1. **Lista de continentes: resuelta; `enum` pendiente.** La lista es la confirmada por el equipo el 2026-09-28 en HU-RSS-009 (`HU-RSS-captura.md`; `contrato-canales-fuentes-rss.openapi.yaml` v1.6.0): los 5 continentes habitados — América, Europa, Asia, África y Oceanía. La maqueta, que asumía seis (América del Norte y América del Sur por separado), debe ajustarse a estos cinco. Sigue pendiente: los contratos definen `continente` como `string` libre; se recomienda convertirlo en un `enum` con esos cinco valores en ambos contratos, para que backend y frontend usen exactamente los mismos literales.
2. **Cómo obtiene el mapa los datos de todos los continentes.** El contrato actual devuelve un único `SentimientoAgregado` por llamada. El mapa necesita uno por continente, lo que hoy implica una llamada por continente. El PDF (sección 10.2) prevé además un recurso `/dashboards` con `GET (nube-palabras, mapa)`. El equipo debe decidir entre N llamadas a `/sentiment` o un endpoint de mapa que devuelva todos los continentes en una sola respuesta.
3. **Rango de fechas con información.** El PDF (sección 4.3.2) pide que el usuario elija la fecha "en el rango de fechas para el que se dispone información". El contrato no expone ese rango (fecha mínima y máxima con datos). Debe definirse de dónde lo obtiene el frontend.
4. **Rangos de color.** La maqueta clasifica solo por signo (mayor que 0 positivo, menor que 0 negativo, igual a 0 neutro). El equipo no ha definido umbrales oficiales para "positivo", "neutro" o "negativo".

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Visualización del humor por continente en la fecha elegida
  Dado que el backend dispone de humor agregado para la fecha 2026-10-02 en los 5 continentes (América, Europa, Asia, África, Oceanía)
  Cuando el usuario abre el dashboard "Mapa de humor" con esa fecha seleccionada
  Entonces el mapa muestra exactamente 1 marcador por cada uno de los 5 continentes
  Y cada marcador muestra el humor_promedio de su continente con 1 decimal y signo explícito cuando es positivo

Escenario: Humor global de la fecha elegida
  Dado que el backend dispone de humor agregado global para la fecha seleccionada
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra el humor_promedio global con 1 decimal
  Y muestra la cantidad_noticias_evaluadas que sustenta ese valor

Escenario: Cambio de fecha dentro del rango con información
  Dado que el dashboard está mostrando la fecha 2026-10-02
  Cuando el usuario selecciona la fecha 2026-09-28, que pertenece al rango con información
  Entonces los valores de todos los marcadores y del humor global pasan a ser los de 2026-09-28
  Y la página no se recarga

Escenario: Selector de fecha limitado al rango con información
  Dado que el rango con información va de la fecha F_min a la fecha F_max
  Cuando el usuario abre el selector de fecha
  Entonces el selector no permite elegir fechas anteriores a F_min ni posteriores a F_max

Escenario: Continente sin noticias evaluadas en la fecha elegida
  Dado que para un continente el backend responde humor_promedio = null y cantidad_noticias_evaluadas = 0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el marcador de ese continente muestra el texto "Sin datos"
  Y la vista no muestra ningún mensaje de error

Escenario: Clasificación visual por signo del humor
  Dado un continente con humor_promedio = +3.4, otro con -4.1 y otro con 0.0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el primero se representa como positivo, el segundo como negativo y el tercero como neutro
  Y la vista incluye una leyenda que explica las 4 representaciones (positivo, neutro, negativo, sin datos)

Escenario: El backend no responde o responde con error
  Dado que GET /api/v1/sentiment responde con código HTTP 500 o no responde dentro del timeout configurado
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra un mensaje de error legible para el usuario
  Y no queda la pantalla en blanco ni un indicador de carga indefinido
```

**Nota de grounding (lista de noticias en el dashboard de humor):** el PDF (sección 4.3.2) pide además que el dashboard de humor ofrezca "una lista de las noticias que más han influido en el cálculo del humor". Ese requisito se cubre con HU-DASH-002; el equipo debe confirmar si basta con que la lista esté en una vista propia accesible desde el menú (como en la maqueta) o si debe mostrarse dentro de la misma vista del mapa.

**Nota de grounding (escala):** la escala de -10 a +10 que muestra la leyenda proviene del PDF (sección 10.4) y de la sección 11 de las instrucciones del proyecto.

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto — código revisado por al menos 1 integrante vía Pull Request, pruebas unitarias con dependencias externas aisladas mediante mocks, cobertura ≥ 80% verificada en GitHub Actions, SonarQube sin issues críticos, build y despliegue con `needs: [test, sonarqube]`.) Adicionalmente:
- La vista consume `GET /api/v1/sentiment` real; no quedan datos de ejemplo en el camino de producción.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo al menos los 7 escenarios Gherkin anteriores. Nunca pruebas unitarias con llamadas reales al backend ni al servidor de teselas del mapa.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.
- `ADR-005-stack-frontend-dashboards.md` en estado Aceptado.
- Puntos pendientes 1 a 4 de esta historia resueltos y reflejados en el contrato.

---

## HU-DASH-001 — Dashboard mapa mundial de humor (DEPRECADA)

> **Estado: Deprecada (2026-10-05).** Reemplazada por **HU-DASH-001-v2**. Se conserva sin cambios para trazabilidad. Motivo: asumía 6 continentes y daba la lista por no definida, en contradicción con la decisión del equipo en HU-RSS-009 (5 continentes).

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global *(PDF, sección 4.1)*,
**quiero** ver en un mapa del mundo el humor de cada continente en una fecha que yo elija dentro del rango con información disponible,
**para** identificar de un vistazo qué regiones están de mejor o peor humor y cómo cambia ese humor de un día a otro.

**Prioridad:** Alta *(es la vista principal del proyecto: PDF, sección 4.3.2)*
**Estimación (Planning Poker P3):** 5 puntos *(ya estimado formalmente en el Planning Poker de la Práctica P3 — ver `Anexo-I-Planificacion-entregado-P3.md`; no es un valor definitivo: el detalle de esta historia se escribió después de estimar, por lo que el equipo debe revalidar si 5 puntos sigue siendo representativo)*
**Depende de contrato de API:** Sí — `GET /api/v1/sentiment` con parámetros de query `continente`, `desde` y `hasta` (HU-SENT-004) — ver `contrato-sentimiento-diccionario.openapi.yaml`, tag `sentiment`, esquema `SentimientoAgregado` (`humor_promedio`, `cantidad_noticias_evaluadas`, `serie_temporal`).
**Valor de humor que consume:** `humor_promedio` (promedio de `valor_humor` de las noticias que cumplen el filtro), calculado por el backend. No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo** (no resueltos por este documento):
1. **Lista cerrada de continentes.** El contrato define `continente` como `string` libre y la carga inicial de fuentes por continente (HU-RSS-009) aún no fija la lista definitiva. La maqueta asume seis: América del Norte, América del Sur, Europa, África, Asia y Oceanía. Se recomienda convertir el parámetro en un `enum` en el contrato para que backend y frontend usen exactamente los mismos valores.
2. **Cómo obtiene el mapa los datos de todos los continentes.** El contrato actual devuelve un único `SentimientoAgregado` por llamada. El mapa necesita uno por continente, lo que hoy implica una llamada por continente. El PDF (sección 10.2) prevé además un recurso `/dashboards` con `GET (nube-palabras, mapa)`. El equipo debe decidir entre N llamadas a `/sentiment` o un endpoint de mapa que devuelva todos los continentes en una sola respuesta.
3. **Rango de fechas con información.** El PDF (sección 4.3.2) pide que el usuario elija la fecha "en el rango de fechas para el que se dispone información". El contrato no expone ese rango (fecha mínima y máxima con datos). Debe definirse de dónde lo obtiene el frontend.
4. **Rangos de color.** La maqueta clasifica solo por signo (mayor que 0 positivo, menor que 0 negativo, igual a 0 neutro). El equipo no ha definido umbrales oficiales para "positivo", "neutro" o "negativo".

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Visualización del humor por continente en la fecha elegida
  Dado que el backend dispone de humor agregado para la fecha 2026-10-02 en 6 continentes
  Cuando el usuario abre el dashboard "Mapa de humor" con esa fecha seleccionada
  Entonces el mapa muestra exactamente 1 marcador por cada uno de los 6 continentes
  Y cada marcador muestra el humor_promedio de su continente con 1 decimal y signo explícito cuando es positivo

Escenario: Humor global de la fecha elegida
  Dado que el backend dispone de humor agregado global para la fecha seleccionada
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra el humor_promedio global con 1 decimal
  Y muestra la cantidad_noticias_evaluadas que sustenta ese valor

Escenario: Cambio de fecha dentro del rango con información
  Dado que el dashboard está mostrando la fecha 2026-10-02
  Cuando el usuario selecciona la fecha 2026-09-28, que pertenece al rango con información
  Entonces los valores de todos los marcadores y del humor global pasan a ser los de 2026-09-28
  Y la página no se recarga

Escenario: Selector de fecha limitado al rango con información
  Dado que el rango con información va de la fecha F_min a la fecha F_max
  Cuando el usuario abre el selector de fecha
  Entonces el selector no permite elegir fechas anteriores a F_min ni posteriores a F_max

Escenario: Continente sin noticias evaluadas en la fecha elegida
  Dado que para un continente el backend responde humor_promedio = null y cantidad_noticias_evaluadas = 0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el marcador de ese continente muestra el texto "Sin datos"
  Y la vista no muestra ningún mensaje de error

Escenario: Clasificación visual por signo del humor
  Dado un continente con humor_promedio = +3.4, otro con -4.1 y otro con 0.0
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces el primero se representa como positivo, el segundo como negativo y el tercero como neutro
  Y la vista incluye una leyenda que explica las 4 representaciones (positivo, neutro, negativo, sin datos)

Escenario: El backend no responde o responde con error
  Dado que GET /api/v1/sentiment responde con código HTTP 500 o no responde dentro del timeout configurado
  Cuando el usuario abre el dashboard "Mapa de humor"
  Entonces la vista muestra un mensaje de error legible para el usuario
  Y no queda la pantalla en blanco ni un indicador de carga indefinido
```

**Nota de grounding (lista de noticias en el dashboard de humor):** el PDF (sección 4.3.2) pide además que el dashboard de humor ofrezca "una lista de las noticias que más han influido en el cálculo del humor". Ese requisito se cubre con HU-DASH-002; el equipo debe confirmar si basta con que la lista esté en una vista propia accesible desde el menú (como en la maqueta) o si debe mostrarse dentro de la misma vista del mapa.

**Nota de grounding (escala):** la escala de -10 a +10 que muestra la leyenda proviene del PDF (sección 10.4) y de la sección 11 de las instrucciones del proyecto.

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto — código revisado por al menos 1 integrante vía Pull Request, pruebas unitarias con dependencias externas aisladas mediante mocks, cobertura ≥ 80% verificada en GitHub Actions, SonarQube sin issues críticos, build y despliegue con `needs: [test, sonarqube]`.) Adicionalmente:
- La vista consume `GET /api/v1/sentiment` real; no quedan datos de ejemplo en el camino de producción.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo al menos los 7 escenarios Gherkin anteriores. Nunca pruebas unitarias con llamadas reales al backend ni al servidor de teselas del mapa.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.
- `ADR-005-stack-frontend-dashboards.md` en estado Aceptado.
- Puntos pendientes 1 a 4 de esta historia resueltos y reflejados en el contrato.

---

## HU-DASH-002-v3 — Listado de noticias más influyentes, con la explicación de su humor

**Reemplaza a:** HU-DASH-002-v2 (Deprecada). **Qué cambió:** cada noticia del listado puede mostrar las palabras del diccionario que explican su valor de humor, con el valor de cada una y el cálculo del promedio; `GET /api/v1/news/{id}` agrega el campo `terminos`. **Por qué:** en la revisión del 2026-11-04 el profesor no podía ver por qué una noticia tenía un valor determinado. El dato ya existía (coincidencias de HU-SENT-008) pero ninguna vista ni endpoint lo exponía. Decisión de la PO del 2026-11-04. El resto de la historia no cambia.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global,
**quiero** ver el listado de las noticias que más han influido en el humor calculado, con su valor de humor, sus datos de origen y las palabras que explican ese valor, y poder filtrarlo,
**para** entender qué hechos concretos explican el humor que muestra el dashboard y comprobar cómo se calculó.

**Prioridad:** Alta
**Estimación:** sin estimar. HU-DASH-002-v2 quedó en 2 puntos de P3 pendiente de reestimar; esta versión agrega alcance. Punto de partida a validar por el equipo en Planning Poker, no un valor definitivo.
**Depende de contrato de API:** Sí — `GET /api/v1/news` y `GET /api/v1/news/{id}` — ver `contrato-noticias.openapi.yaml` (v1.2.0, campo `terminos` en `NoticiaDetalle`).
**Variante del algoritmo:** la explicación muestra los términos únicos coincidentes de HU-SENT-007-v3, persistidos por HU-SENT-008. Con `metodo_calculo = "diccionario"`, `valor_humor` es su promedio simple (ADR-003). Con `metodo_calculo = "ml"`, el valor lo calculó el modelo (HU-SENT-006) y las palabras se muestran solo como referencia.

**Decisiones:** las 4 de HU-DASH-002-v2 se mantienen. Se agregan:
5. **Explicación bajo demanda:** un botón "¿Por qué este valor?" por noticia pide `GET /news/{id}` solo al abrirse, para no cargar los términos de toda la página en el listado.
6. **Orden de los términos:** del más negativo al más positivo y, a igual valor, por palabra.

**Puntos pendientes de decisión del equipo:** el punto 1 de HU-DASH-002-v2 (ubicación en la interfaz) sigue abierto.

### Criterios de aceptación (Gherkin)

Se mantienen los 10 escenarios de HU-DASH-002-v2. Se agregan:

```gherkin
Escenario: Explicación del humor calculado por diccionario
  Dado una noticia con metodo_calculo = "diccionario" cuyas coincidencias son "crisis" (-6) y "war" (-4)
  Cuando el usuario presiona "¿Por qué este valor?" en esa noticia
  Entonces la vista muestra "crisis -6" y "war -4", en ese orden
  Y muestra el cálculo "(-6 -4) / 2 = -5.0", igual al valor_humor de la noticia

Escenario: Explicación del humor calculado por el modelo de ML
  Dado una noticia con metodo_calculo = "ml" y 1 término coincidente
  Cuando el usuario presiona "¿Por qué este valor?"
  Entonces la vista indica que el humor lo calculó el modelo de ML
  Y muestra el término coincidente como referencia, sin cálculo de promedio

Escenario: Noticia sin términos del diccionario
  Dado una noticia sin coincidencias registradas
  Cuando el usuario presiona "¿Por qué este valor?"
  Entonces la vista muestra "No se encontraron palabras del diccionario en esta noticia."

Escenario: Términos en el detalle por API
  Cuando se envía GET a /api/v1/news/{id} de una noticia con 2 coincidencias
  Entonces la respuesta incluye "terminos" con 2 elementos, cada uno con palabra, idioma y valor
  Y no incluye los términos de otras noticias
```

### Definition of Done
(Bloque general DoD, sección 14.) Además de la DoD de HU-DASH-002-v2:
- `contrato-noticias.openapi.yaml` v1.2.0 revisado por el equipo.
- Pruebas del backend del detalle con términos (`src/tests/test_news.py`) y del frontend de los 3 escenarios de la vista (`ListadoNoticias.test.jsx`), con la API simulada.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.

**Estado de implementación (2026-11-04):** implementada en la rama `feature/explicacion-humor`, pendiente de revisión en el PR y de ratificación del equipo.

---

## HU-DASH-002-v2 — Listado de noticias más influyentes (DEPRECADA)

> **Estado: Deprecada (2026-11-04).** Reemplazada por **HU-DASH-002-v3**. Se conserva sin cambios para trazabilidad. Motivo: no mostraba qué palabras explican el valor de humor de cada noticia.

**Reemplaza a:** HU-DASH-002 (Deprecada). **Qué cambió:** se resuelven los 4 puntos pendientes y la historia pasa a depender de `contrato-noticias.openapi.yaml` (`GET /api/v1/news` y `GET /api/v1/news/{id}`). **Por qué:** propuesta de Valentín García (influencia = valor absoluto de `valor_humor`, paginación de 10 por defecto y 50 como máximo, filtros) con tres ajustes de la PO del 2026-10-18: día de referencia `COALESCE(fecha_publicacion, fecha_registro)`, desempate estable por `id` y parámetro `orden` (`fecha` o `influencia`). Se agregan 4 escenarios Gherkin.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global,
**quiero** ver el listado de las noticias que más han influido en el humor calculado, con su valor de humor y sus datos de origen, y poder filtrarlo,
**para** entender qué hechos concretos explican el humor que muestra el dashboard.

**Prioridad:** Alta
**Estimación (Planning Poker P3):** 2 puntos *(estimado en P3 sin contrato ni paginación; el alcance creció con los filtros, la paginación y el detalle, por lo que el equipo debe reestimar en Planning Poker. No se propone aquí una cifra nueva)*
**Depende de contrato de API:** Sí — `GET /api/v1/news` y `GET /api/v1/news/{id}` — ver `contrato-noticias.openapi.yaml` (v1.0.0).
**Valor de humor que consume:** `valor_humor` de cada noticia, calculado y persistido por el backend (HU-SENT-002-v3). La influencia (`|valor_humor|`) y el orden los calcula el backend. No aplica ninguna variante propia del algoritmo.

**Decisiones (antes puntos pendientes de HU-DASH-002):**
1. **Influencia** = valor absoluto de `valor_humor`: mientras más lejos de 0, más influyente. Con `orden=influencia`, desempata la fecha de referencia más reciente y después el `id`.
2. **Cantidad:** paginación con la convención de `/channels` y `/sources` (`items`, `pagina`, `tamanio_pagina`, `total`); 10 por página por defecto y 50 como máximo.
3. **Filtros:** `signo` (`todas`, `positivas`, `negativas`), `continente` (enum de 5), `pais` y `fecha` (día de referencia, la misma regla que el mapa). La vista usa signo, continente y país (2026-10-19, mismo selector de país que la nube); fecha queda disponible en la API.
4. **Nombres de campos:** los del modelo (`enlace_original`, `categoria_iptc`). La "fuente" que muestra la vista es el nombre del `CanalNoticias` (campo `canal`), porque `FuenteRSS` solo tiene url (hallazgo H-6). El frontend traduce el código IPTC a su nombre.

**Puntos pendientes de decisión del equipo:**
1. **Ubicación en la interfaz.** Sigue abierta la pregunta de HU-DASH-001-v3: basta con la vista propia del menú, o la lista debe aparecer también dentro del dashboard de humor.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Listado ordenado por influencia
  Dado que existen noticias con valor_humor +7.5, -7.2, -6.8 y +3.9
  Cuando el usuario abre la vista "Noticias"
  Entonces las noticias aparecen en el orden +7.5, -7.2, -6.8, +3.9
  Y ese orden corresponde al valor absoluto de valor_humor de mayor a menor

Escenario: Datos visibles de cada noticia
  Cuando el usuario abre la vista "Noticias"
  Entonces cada noticia muestra su título, su valor_humor con 1 decimal y signo, su canal, su continente, el nombre de su categoría IPTC y su fecha de referencia
  Y el título es un enlace al enlace_original de la noticia que se abre en una pestaña nueva

Escenario: Filtro de noticias positivas
  Dado que existen noticias con valor_humor positivo, negativo e igual a 0
  Cuando el usuario elige el filtro "Positivas"
  Entonces la lista muestra únicamente noticias con valor_humor mayor que 0

Escenario: Filtro de noticias negativas
  Dado que existen noticias con valor_humor positivo, negativo e igual a 0
  Cuando el usuario elige el filtro "Negativas"
  Entonces la lista muestra únicamente noticias con valor_humor menor que 0

Escenario: Filtro por continente
  Dado que existen noticias de canales de Europa y de Oceanía
  Cuando el usuario elige el continente "Europa"
  Entonces la lista muestra únicamente noticias de canales de Europa

Escenario: Noticias sin humor calculado
  Dado que existen noticias con valor_humor = null
  Cuando el usuario abre la vista "Noticias"
  Entonces esas noticias no aparecen en el listado

Escenario: Paginación estable
  Dado que existen 25 noticias con humor calculado
  Cuando el usuario recorre las páginas 1, 2 y 3 de 10 noticias
  Entonces ve exactamente 25 noticias distintas, sin repetir ni saltar ninguna
  Y la vista indica la página actual y el total de noticias

Escenario: Desempate por fecha y por id
  Dado dos noticias con el mismo |valor_humor|
  Cuando el listado se ordena por influencia
  Entonces aparece primero la de fecha de referencia más reciente y, si coincide, la de id mayor

Escenario: Filtro sin resultados
  Dado que ninguna noticia cumple el filtro elegido
  Cuando el usuario aplica ese filtro
  Entonces la vista muestra el mensaje "No hay noticias para este filtro"
  Y no muestra ningún mensaje de error

Escenario: Detalle de una noticia inexistente
  Cuando se envía GET a /api/v1/news/999 y esa noticia no existe
  Entonces el sistema responde con código HTTP 404 y codigo "NOTICIA_NO_ENCONTRADA"
```

**Nota de grounding (categoría):** la categoría es el primer nivel de IPTC Media Topics (PDF, sección 3, Alcance, punto 3); la noticia la hereda de su fuente (HU-RSS-002).

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto.) Adicionalmente:
- `contrato-noticias.openapi.yaml` aprobado por el equipo.
- La vista consume el endpoint real; el orden por influencia, los filtros y la paginación los aplica el backend.
- Pruebas del backend de los escenarios anteriores (implementadas en `src/tests/test_news.py`).
- Pruebas unitarias del frontend con la llamada a la API simulada mediante mock (herramienta pendiente, `ADR-005-stack-frontend-dashboards.md`).
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.

---

## HU-DASH-002 — Listado de noticias más influyentes (DEPRECADA)

> **Estado: Deprecada (2026-10-19).** Reemplazada por **HU-DASH-002-v2**. Se conserva sin cambios para trazabilidad. Motivo: tenía 4 puntos pendientes y ningún contrato de API.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global,
**quiero** ver el listado de las noticias que más han influido en el humor calculado, con su valor de humor y sus datos de origen,
**para** entender qué hechos concretos explican el humor que muestra el dashboard.

**Prioridad:** Alta
**Estimación (Planning Poker P3):** 2 puntos *(ya estimado en P3; valor de partida sujeto a revalidación del equipo, en especial porque el contrato de API que necesita todavía no existe)*
**Depende de contrato de API:** Sí — recurso nuevo, **no existe todavía en ningún contrato**. El PDF (sección 10.2) exige `/news` con `GET (lista, detalle, filtros, influyentes)`. Debe crearse el contrato antes de integrar esta historia.
**Valor de humor que consume:** `valor_humor` de cada noticia, calculado y persistido por el backend (HU-SENT-002-v2 y HU-SENT-003). No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo:**
1. **Definición de "influyente".** El PDF no la define. La maqueta usa el valor absoluto de `valor_humor` (mientras más lejos de 0, más influyente). Es una definición propuesta, no decidida: el equipo debe ratificarla o reemplazarla, y el orden debe calcularlo el backend, no el frontend.
2. **Cantidad máxima de noticias del listado.** No hay cifra en el PDF. Debe fijarse un límite o una paginación coherente con la convención ya usada en `/channels` y `/sources` (`items`, `pagina`, `tamanio_pagina`, `total`).
3. **Filtros.** El PDF menciona "filtros" sin detallarlos. La maqueta filtra por signo (todas, positivas, negativas). Falta decidir si se filtra también por continente y por fecha, en coherencia con HU-DASH-001-v3.
4. **Nombres de campos.** La maqueta supuso `enlace` y `categoria`; el modelo `Noticia` vigente en `docs/architecture.md` (sección 5) usa `enlace_original` y `categoria_iptc`. El contrato debe seguir el modelo, y los datos de ejemplo deben corregirse a esos nombres.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Listado ordenado por influencia
  Dado que existen noticias con valor_humor +7.5, -7.2, -6.8 y +3.9
  Cuando el usuario abre la vista "Noticias"
  Entonces las noticias aparecen en el orden +7.5, -7.2, -6.8, +3.9
  Y ese orden corresponde al valor absoluto de valor_humor de mayor a menor

Escenario: Datos visibles de cada noticia
  Cuando el usuario abre la vista "Noticias"
  Entonces cada noticia muestra su título, su valor_humor con 1 decimal y signo, su fuente, su continente, su categoría IPTC y su fecha de publicación
  Y el título es un enlace al enlace_original de la noticia que se abre en una pestaña nueva

Escenario: Filtro de noticias positivas
  Dado que existen noticias con valor_humor positivo, negativo e igual a 0
  Cuando el usuario elige el filtro "Positivas"
  Entonces la lista muestra únicamente noticias con valor_humor mayor que 0

Escenario: Filtro de noticias negativas
  Dado que existen noticias con valor_humor positivo, negativo e igual a 0
  Cuando el usuario elige el filtro "Negativas"
  Entonces la lista muestra únicamente noticias con valor_humor menor que 0

Escenario: Noticias sin humor calculado
  Dado que existen noticias con valor_humor = null (pendientes de cálculo, ver HU-SENT-003)
  Cuando el usuario abre la vista "Noticias"
  Entonces esas noticias no aparecen en el listado

Escenario: Filtro sin resultados
  Dado que ninguna noticia cumple el filtro elegido
  Cuando el usuario aplica ese filtro
  Entonces la vista muestra el mensaje "No hay noticias para este filtro"
  Y no muestra ningún mensaje de error
```

**Nota de grounding (categoría):** la categoría mostrada es el primer nivel de IPTC Media Topics, tal como exige el PDF (sección 3, Alcance, punto 3).

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto.) Adicionalmente:
- Contrato de `/news` creado y aprobado por el equipo, originado en esta historia.
- La vista consume el endpoint real; el orden por influencia y el límite de resultados los aplica el backend.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo los 6 escenarios Gherkin anteriores.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.

---

## HU-DASH-003-v2 — Nube de palabras influyentes con filtros

**Reemplaza a:** HU-DASH-003 (Deprecada). **Qué cambió:** se define el peso de una palabra y el origen de sus datos, y la historia pasa a depender de HU-SENT-008 y de `contrato-dashboards.openapi.yaml`. **Por qué:** HU-DASH-003 dependía de coincidencias término–noticia que ninguna historia persistía, y su ejemplo de peso contradecía HU-SENT-007 (hallazgos H-2 y H-3 de `Revision-consistencia-EPIC-DASH-2026-10-05.md`). Decisiones de equipo de la sesión del 2026-10-05. Los criterios de aceptación no cambian.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global,
**quiero** ver una nube con las palabras que más influyen en el cálculo del humor, pudiendo filtrarla por continente o por país,
**para** reconocer qué términos dominan el humor de una región sin tener que leer noticia por noticia.

**Prioridad:** Media *(el PDF la exige en la sección 4.3.1, pero depende de más decisiones abiertas que las otras dos vistas)*
**Estimación (Planning Poker P3):** 5 puntos *(ya estimado en P3; valor de partida sujeto a revalidación del equipo: la definición de "influencia" de una palabra y su relación con el camino de ML no estaban resueltas al estimar)*
**Depende de contrato de API:** Sí — `GET /api/v1/dashboards/word-cloud` con parámetros de query `continente`, `pais` y `limite` — ver `contrato-dashboards.openapi.yaml`, esquema `NubePalabras`.
**Valor de humor que consume:** el `valor` de cada término del diccionario (escala -10 a +10, HU-SENT-001) y su `peso`, calculado por el backend como la cantidad de noticias del filtro que contienen el término (HU-SENT-008). No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo:**
1. **Definición de "influencia" de una palabra: resuelto.** Peso = cantidad de noticias del filtro que contienen el término (decisión de equipo, 2026-10-05). Cada término cuenta una sola vez por noticia, en coherencia con HU-SENT-007 y `ADR-003-eleccion-algoritmo-agregacion-sentimiento.md`; no se cuentan las repeticiones dentro de un mismo texto.
2. **Relación con el camino de ML: resuelto.** La nube se construye siempre a partir de las coincidencias con el diccionario, que HU-SENT-008 registra en una tabla de unión para toda noticia capturada, también cuando su humor lo calcula el modelo de ML.
3. **Filtro por país.** El PDF pide filtro "por continente o país". La maqueta implementa solo continente. Falta definir de dónde sale la lista de países (`CanalNoticias.pais` es opcional en el modelo vigente).
4. **Cantidad máxima de palabras.** No hay cifra en el PDF; debe fijarse un límite para que la nube sea legible. El contrato ya expone el parámetro `limite`, sin valor por defecto ni máximo.
5. **Idioma.** Los términos son únicos por palabra e idioma (HU-SENT-001). Falta decidir si la nube mezcla español e inglés y cómo trata una misma palabra presente en ambos idiomas.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Tamaño proporcional a la influencia
  Dado un conjunto de palabras con peso 100, 50 y 10
  Cuando el usuario abre la vista "Nube de palabras"
  Entonces la palabra de peso 100 se muestra con el tamaño de letra máximo
  Y cada una de las demás se muestra con un tamaño estrictamente menor que el de cualquier palabra de mayor peso

Escenario: Color según el signo del valor del término
  Dado una palabra con valor +8 y otra con valor -10 en el diccionario
  Cuando el usuario abre la vista "Nube de palabras"
  Entonces la primera se representa como positiva y la segunda como negativa
  Y la vista incluye una leyenda que explica ambas representaciones

Escenario: Filtro por continente
  Dado que la nube está mostrando las palabras de todo el mundo
  Cuando el usuario elige el continente "Asia"
  Entonces la nube muestra únicamente las palabras influyentes de Asia
  Y la página no se recarga

Escenario: Filtro por país
  Dado que existen canales con país informado
  Cuando el usuario elige un país
  Entonces la nube muestra únicamente las palabras influyentes de ese país

Escenario: Consulta del valor de una palabra
  Cuando el usuario sitúa el puntero sobre una palabra de la nube
  Entonces la vista muestra el valor de esa palabra en el diccionario, con signo

Escenario: Filtro sin palabras
  Dado que no hay palabras influyentes para el filtro elegido
  Cuando el usuario aplica ese filtro
  Entonces la vista muestra el mensaje "No hay palabras para este filtro"
  Y no muestra ningún mensaje de error
```

**Nota de grounding (diccionario opcional):** la corrección del 21/08/26 al PDF (sección 4.2.2) indica que el diccionario solo es obligatorio si se usa el método de evaluación de la sección 10.4. El equipo eligió un enfoque híbrido que conserva el diccionario (HU-SENT-007), por lo que la nube de palabras sigue teniendo una fuente de datos válida.

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto.) Adicionalmente:
- `contrato-dashboards.openapi.yaml` aprobado por el equipo.
- HU-SENT-008 implementada y cumpliendo su propia Definition of Done.
- El peso de cada palabra lo calcula el backend; el frontend no implementa ninguna fórmula de influencia.
- Filtro por país implementado, además del filtro por continente.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo los 6 escenarios Gherkin anteriores.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.

---

## HU-DASH-003 — Nube de palabras influyentes con filtros (DEPRECADA)

> **Estado: Deprecada (2026-10-05).** Reemplazada por **HU-DASH-003-v2**. Se conserva sin cambios para trazabilidad. Motivo: no definía el peso de una palabra y dependía de un dato que el backend no persistía.

**Tipo:** Historia de Usuario
**Como** analista de medios o usuario interesado en la evolución del sentimiento global,
**quiero** ver una nube con las palabras que más influyen en el cálculo del humor, pudiendo filtrarla por continente o por país,
**para** reconocer qué términos dominan el humor de una región sin tener que leer noticia por noticia.

**Prioridad:** Media *(el PDF la exige en la sección 4.3.1, pero depende de más decisiones abiertas que las otras dos vistas)*
**Estimación (Planning Poker P3):** 5 puntos *(ya estimado en P3; valor de partida sujeto a revalidación del equipo: la definición de "influencia" de una palabra y su relación con el camino de ML no estaban resueltas al estimar)*
**Depende de contrato de API:** Sí — recurso nuevo, **no existe todavía en ningún contrato**. El PDF (sección 10.2) exige `/dashboards` con `GET (nube-palabras, mapa)`. Debe crearse el contrato antes de integrar esta historia.
**Valor de humor que consume:** el `valor` de cada término del diccionario (escala -10 a +10, HU-SENT-001) y un peso de influencia calculado por el backend. No aplica ninguna variante propia del algoritmo.

**Puntos pendientes de decisión del equipo:**
1. **Definición de "influencia" de una palabra.** El PDF no la define. La maqueta recibe un campo `peso` ya calculado y solo lo usa para el tamaño de la letra. El equipo debe decidir cómo se calcula ese peso en el backend (por ejemplo, frecuencia de aparición o frecuencia ponderada por el valor absoluto del término). Esa decisión es de EPIC-SENT, no de la capa de presentación.
2. **Relación con el camino de ML.** Cuando el humor de una noticia se calcula con el modelo de ML (`ADR-004-arquitectura-modelo-ml-sentimiento.md`: embeddings más regresor), el cálculo no usa términos del diccionario. El equipo debe decidir si la nube se construye siempre a partir de las coincidencias con el diccionario, independientemente del método que calculó el humor.
3. ~~**Filtro por país.**~~ **Resuelto el 2026-10-19:** la lista de países sale del campo `pais` de los canales registrados (`GET /api/v1/channels`, HU-RSS-010), el mismo dato con el que el backend filtra; con un continente elegido solo se ofrecen sus países. Los canales sin país informado solo aparecen en el filtro por continente.
4. **Cantidad máxima de palabras.** No hay cifra en el PDF; debe fijarse un límite para que la nube sea legible.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Tamaño proporcional a la influencia
  Dado un conjunto de palabras con peso 100, 50 y 10
  Cuando el usuario abre la vista "Nube de palabras"
  Entonces la palabra de peso 100 se muestra con el tamaño de letra máximo
  Y cada una de las demás se muestra con un tamaño estrictamente menor que el de cualquier palabra de mayor peso

Escenario: Color según el signo del valor del término
  Dado una palabra con valor +8 y otra con valor -10 en el diccionario
  Cuando el usuario abre la vista "Nube de palabras"
  Entonces la primera se representa como positiva y la segunda como negativa
  Y la vista incluye una leyenda que explica ambas representaciones

Escenario: Filtro por continente
  Dado que la nube está mostrando las palabras de todo el mundo
  Cuando el usuario elige el continente "Asia"
  Entonces la nube muestra únicamente las palabras influyentes de Asia
  Y la página no se recarga

Escenario: Filtro por país
  Dado que existen canales con país informado
  Cuando el usuario elige un país
  Entonces la nube muestra únicamente las palabras influyentes de ese país

Escenario: Consulta del valor de una palabra
  Cuando el usuario sitúa el puntero sobre una palabra de la nube
  Entonces la vista muestra el valor de esa palabra en el diccionario, con signo

Escenario: Filtro sin palabras
  Dado que no hay palabras influyentes para el filtro elegido
  Cuando el usuario aplica ese filtro
  Entonces la vista muestra el mensaje "No hay palabras para este filtro"
  Y no muestra ningún mensaje de error
```

**Nota de grounding (diccionario opcional):** la corrección del 21/08/26 al PDF (sección 4.2.2) indica que el diccionario solo es obligatorio si se usa el método de evaluación de la sección 10.4. El equipo eligió un enfoque híbrido que conserva el diccionario (HU-SENT-007), por lo que la nube de palabras sigue teniendo una fuente de datos válida.

### Definition of Done
(Bloque general DoD, sección 14 de las instrucciones del proyecto.) Adicionalmente:
- Contrato de `/dashboards` (nube de palabras) creado y aprobado por el equipo, originado en esta historia.
- El peso de cada palabra lo calcula el backend; el frontend no implementa ninguna fórmula de influencia.
- Filtro por país implementado, además del filtro por continente.
- Pruebas unitarias con la llamada a la API simulada mediante mock, cubriendo los 6 escenarios Gherkin anteriores.
- Validado visualmente en al menos una resolución de pantalla, registrada en el Pull Request.

---

## HU-DASH-004-v2 — Ayudas "?" junto a cada parte de las vistas

**Reemplaza a:** HU-DASH-004 (Deprecada). **Qué cambia:** el recuadro ancho "Cómo leer esta pantalla" al inicio de cada vista se reemplaza por un ícono **"?"** junto a la parte que explica. Al pasar el mouse, enfocarlo con el teclado o tocarlo en el celular, muestra qué es y qué hace esa parte. La escala de -10 a +10, la explicación del humor de cada noticia, el detalle de la nube y los bloques de Fuentes RSS no cambian. **Por qué:** el recuadro ocupaba mucho espacio y se separaba de lo que explicaba. Con la ayuda junto a cada parte, la pantalla queda más limpia y la explicación aparece donde se necesita. Decisión de la PO del 2026-11-12.

**Tipo:** Historia de Usuario
**Como** analista de medios, usuario del sistema o administrador,
**quiero** un ícono de ayuda junto a cada parte de la vista que, al pasarle encima, explique qué es y qué hace,
**para** entender cada elemento en el momento en que lo miro, sin que la pantalla se llene de texto.

**Origen:** HU-DASH-004 (observación del profesor de frontend del 2026-11-11) y la decisión de la PO del 2026-11-12. PDF §4.3 ("Se priorizará un diseño limpio, con gráficos interactivos") y §2, objetivo específico 3. No agrega vistas, datos ni endpoints: solo presentación.
**Prioridad:** Alta
**Estimación:** sin estimar. Punto de partida a validar por el equipo en Planning Poker, no un valor definitivo.
**Depende de contrato de API:** No.
**Variante del algoritmo:** no calcula humor. Muestra el promedio simple de ADR-003 tal como lo calcula el backend.

**Decisiones de diseño (propuestas por el agente PO/Arquitecto, a ratificar):**
1. **Componente `Ayuda`:** botón redondo amarillo con "?" y un globo con título y texto. Se abre al pasar el mouse o al enfocarlo con el teclado. En pantallas táctiles se abre y se cierra tocándolo, y también se cierra al tocar fuera o con Escape. En el celular (≤ 600 px) el globo aparece como tarjeta fija abajo, para que el borde de la pantalla nunca lo corte.
2. **Accesibilidad:** el botón se llama "Ayuda: <título>" y el globo es su descripción (`aria-describedby`, `role="tooltip"`). La ayuda va al lado del título y no dentro, para que el lector de pantalla no lea la ayuda como parte del encabezado.
3. **Ubicación:**
   - **Mapa:** junto a "Fecha", a "Humor global", a la leyenda de las caritas y al título del gráfico de evolución.
   - **Noticias y Nube:** junto al título de la vista, con sus puntos. En Noticias incluye la escala.
   - **Administración:** junto al título de cada bloque numerado de Fuentes RSS y de Parámetros. Diccionario, Purgado y Modelo ML ganan un título con su ayuda; la de Diccionario incluye la escala.
4. Los textos son los mismos de HU-DASH-004, repartidos por parte.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Las vistas no muestran el recuadro ancho
  Cuando el usuario abre "Mapa de humor", "Nube de palabras", "Noticias" o una pestaña de "Administración"
  Entonces la vista no muestra el recuadro "Cómo leer esta pantalla"
  Y cada parte explicada tiene al lado un botón "?" llamado "Ayuda: <título>"

Escenario: La ayuda se abre al pasar el mouse o al enfocarla
  Dado el bloque "3 Cobertura de noticias" de la pestaña "Parámetros"
  Cuando el usuario pasa el mouse sobre su "?" o lo enfoca con el teclado
  Entonces se muestra el globo "Cobertura: Muestra cuántas noticias tienen humor y por qué quedaron fuera las demás."

Escenario: La ayuda en pantallas táctiles
  Dado que la ayuda está cerrada
  Cuando el usuario toca el "?"
  Entonces el globo queda abierto
  Y se cierra al tocar fuera de la ayuda o al presionar Escape

Escenario: La escala dentro de la ayuda
  Cuando el usuario abre la ayuda de "Noticias" o la de la pestaña "Diccionario"
  Entonces el globo incluye la escala de humor de -10 a +10

Escenario: Humor global en la escala (sin cambios respecto de HU-DASH-004)
  Dado que el humor global del día elegido es -1.8
  Cuando el usuario abre "Mapa de humor"
  Entonces la escala de -10 a +10 marca "Mundo -1.8" a la izquierda del 0
```

Los escenarios de HU-DASH-004 sobre la nube, la explicación de una noticia en 3 pasos y los bloques de Fuentes RSS siguen vigentes sin cambios.

### Definition of Done
(Bloque general DoD, sección 14.) Adicionalmente:
- Pruebas con Vitest y Testing Library del componente `Ayuda` (abrir, cerrar con Escape y tocando fuera, descripción accesible) y de las ayudas de cada vista (`GuiaVisual.test.jsx`, `ListadoNoticias.test.jsx`, `NubePalabras.test.jsx`, `Administracion.test.jsx`).
- Validado visualmente en una resolución de escritorio (1280 px) y una de celular (390 px), con capturas en el Pull Request.
- Revisión del texto de las ayudas por al menos un miembro del equipo que no lo haya escrito.

**Estado de implementación (2026-11-12):** implementada en la rama `feature/relevancia-noticias`, pendiente de revisión en el PR y de ratificación del equipo.

---

## HU-DASH-004 — Guía visual de lectura de las vistas

**Estado:** **Deprecada (2026-11-12)** — reemplazada por **HU-DASH-004-v2** (ver arriba), que cambia el recuadro "Cómo leer esta pantalla" por ayudas "?" junto a cada parte. Se conserva este bloque íntegro como registro histórico, conforme a la sección 3 de las instrucciones del proyecto.

**Tipo:** Historia de Usuario
**Como** analista de medios, usuario del sistema o administrador que abre una vista por primera vez,
**quiero** que cada vista explique en pantalla qué significa cada elemento (números, caritas, colores, tamaños) y cómo usarla, con una escala visual de -10 a +10,
**para** entender sin ayuda externa qué estoy mirando y por qué una noticia, un continente o una palabra tiene el valor que tiene.

**Origen:** observación del profesor de frontend en la revisión del 2026-11-11: no se entendía qué era cada cosa y pidió que la interfaz fuera más instructiva visualmente, y que se viera por qué una noticia tenía su puntaje. Se apoya en PDF §4.3 ("Se priorizará un diseño limpio, con gráficos interactivos") y §2, objetivo específico 3 (dashboards interactivos). Decisión de la PO del 2026-11-11. No agrega vistas, datos ni endpoints: solo presentación.
**Prioridad:** Alta *(observación directa del profesor)*
**Estimación:** sin estimar. Punto de partida a validar por el equipo en Planning Poker, no un valor definitivo.
**Depende de contrato de API:** No. Usa los endpoints existentes; la explicación por noticia usa `GET /api/v1/news/{id}` (HU-DASH-002-v3).
**Variante del algoritmo:** no calcula humor. Muestra el promedio simple de ADR-003 tal como lo calcula el backend.

**Decisiones de diseño (propuestas por el agente PO/Arquitecto, a ratificar):**
1. **Guía "Cómo leer esta pantalla"** al inicio de cada vista (mapa, nube, noticias y cada pestaña de administración): 2 a 4 pasos numerados con un título corto y una frase. Abierta por defecto y con botón "Ocultar guía".
2. **Escala de humor** reutilizable: barra de color de -10 (rojo) a +10 (verde) con marcas -10, -5, 0, +5, +10 y los textos "Muy negativo", "Neutro" y "Muy positivo". Con un valor, lo marca en su posición.
3. **Mapa:** la escala marca el humor global ("Mundo"); cada continente dice "promedio de N noticias".
4. **Nube:** cada palabra se puede tocar para ver su valor, idioma y cantidad de noticias, con su posición en la escala.
5. **Noticias:** cada tarjeta indica si es positiva, negativa o neutra, y el botón "¿Por qué X?" muestra la explicación en 3 pasos: palabras encontradas, suma y promedio, y resultado en la escala.
6. **Administración:** cada pestaña explica qué hace. La pestaña Fuentes RSS se divide en 3 bloques numerados, cada uno con título y explicación: (1) canal, el medio, con un botón "Ver canales registrados (N)" que despliega la tabla de canales (continente y país) y, por canal, "Ver sus fuentes", que filtra el bloque 3; (2) fuente RSS, un feed de ese medio, que solo se puede agregar si existe un canal; (3) fuentes registradas, con filtros y captura. Así se distingue canal de fuente RSS, según PDF §4.2.1. El resultado de cada acción aparece en su propio bloque.

### Criterios de aceptación (Gherkin)

```gherkin
Escenario: Guía visible al abrir una vista
  Cuando el usuario abre "Mapa de humor", "Nube de palabras", "Noticias" o una pestaña de "Administración"
  Entonces la vista muestra el recuadro "Cómo leer esta pantalla" con entre 2 y 4 pasos numerados

Escenario: Ocultar y volver a mostrar la guía
  Dado que la guía está abierta
  Cuando el usuario presiona "Ocultar guía"
  Entonces los pasos dejan de mostrarse
  Y al presionar "Mostrar guía" vuelven a aparecer

Escenario: Humor global en la escala
  Dado que el humor global del día elegido es -1.8
  Cuando el usuario abre "Mapa de humor"
  Entonces la escala de -10 a +10 marca "Mundo -1.8" a la izquierda del 0

Escenario: Detalle de una palabra de la nube
  Dado que "guerra" vale -8 y aparece en 10 noticias
  Cuando el usuario toca "guerra"
  Entonces la vista muestra "guerra vale -8 en el diccionario (español) y aparece en 10 noticias."
  Y la escala marca "guerra -8.0"

Escenario: Explicación de una noticia en 3 pasos
  Dado una noticia calculada por diccionario con los términos -4, -6 y +1
  Cuando el usuario presiona "¿Por qué -3.0?"
  Entonces la vista muestra los 3 términos con su valor
  Y muestra "Suma: (-4) + (-6) + 1 = -9" y "Promedio: -9 ÷ 3 palabras = -3.0"
  Y la escala marca "Esta noticia -3.0"

Escenario: Diferencia entre canal y fuente RSS
  Cuando el administrador abre la pestaña "Fuentes RSS"
  Entonces ve 3 bloques numerados: "1 Canal: el medio de noticias", "2 Fuente RSS: un feed de ese medio" y "3 Fuentes registradas y captura"
  Y al presionar "Ver canales registrados (N)" se despliega la tabla de canales con su continente y país
  Y "Ver sus fuentes" en un canal filtra la tabla del bloque 3 por ese canal

Escenario: Fuente sin canal
  Dado que no existe ningún canal registrado
  Cuando el administrador abre la pestaña "Fuentes RSS"
  Entonces el bloque 2 muestra "Primero crea un canal en el bloque 1." en lugar del formulario de fuente
```

### Definition of Done
(Bloque general DoD, sección 14.) Adicionalmente:
- Pruebas con Vitest y Testing Library de la guía, la escala y los escenarios de cada vista (`GuiaVisual.test.jsx`, `ListadoNoticias.test.jsx`, `NubePalabras.test.jsx`, `Administracion.test.jsx`).
- Validado visualmente en una resolución de escritorio (1280 px) y una de celular (390 px), con capturas en el Pull Request.
- Revisión del texto de las guías por al menos un miembro del equipo que no lo haya escrito.

**Estado de implementación (2026-11-11):** implementada en la rama `feature/guia-visual` (sobre `feature/explicacion-humor`), pendiente de revisión en el PR y de ratificación del equipo.

---

## Resumen de trazabilidad

| ID | Tipo | Prioridad | Puntos (P3) | Endpoint / mecanismo | Referencia PDF |
|---|---|---|---|---|---|
| HU-DASH-001 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-001-v2 | — | — | — | — |
| HU-DASH-001-v2 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-001-v3 | — | — | — | — |
| HU-DASH-001-v3 | Historia de Usuario | Alta | 5 (por reestimar) | `GET /api/v1/dashboards/map` — ver `contrato-dashboards.openapi.yaml`; `GET /api/v1/sentiment` (serie temporal, HU-SENT-004) | §4.3, §4.3.2, §10.2 |
| HU-DASH-002 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-002-v2 | — | — | — | — |
| HU-DASH-002-v2 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-002-v3 | — | — | — | — |
| HU-DASH-002-v3 | Historia de Usuario | Alta | sin estimar | `GET /api/v1/news` y `GET /api/v1/news/{id}` — ver `contrato-noticias.openapi.yaml` (v1.2.0) | §4.3, §4.3.2, §10.2 |
| HU-DASH-003 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-003-v2 | — | — | — | — |
| HU-DASH-003-v2 | Historia de Usuario | Media | 5 | `GET /api/v1/dashboards/word-cloud` — ver `contrato-dashboards.openapi.yaml` | §4.3, §4.3.1, §10.2 |
| HU-DASH-004 | Historia de Usuario — **Deprecada**, reemplazada por HU-DASH-004-v2 | — | — | — | — |
| HU-DASH-004-v2 | Historia de Usuario | Alta | sin estimar | Sin endpoint propio; usa los existentes | §4.3, §2 (objetivo específico 3) |

Las estimaciones en puntos provienen del Planning Poker de P3 y son un punto de partida, no un valor definitivo: deben revalidarse con el equipo ahora que el alcance está detallado.

## Dependencias con otras épicas

| Historia | Depende de | Motivo |
|---|---|---|
| HU-DASH-001-v3 | HU-SENT-004, HU-SENT-002-v2, HU-SENT-003 | Sin humor calculado y sin el endpoint de consulta no hay datos reales que mostrar |
| HU-DASH-001-v3 | HU-RSS-009 | Fija la lista de 5 continentes (América, Europa, Asia, África, Oceanía) que el mapa debe mostrar |
| HU-DASH-002-v3 | HU-SENT-002-v3, HU-SENT-008 | Necesita `valor_humor` persistido en cada noticia y sus coincidencias término–noticia para explicarlo |
| HU-DASH-003-v2 | HU-SENT-001, HU-SENT-008 | Necesita el diccionario y las coincidencias término–noticia persistidas (`HU-SENT-008-coincidencias-terminos.md`) |

## Tabla de control de versiones

| ID | Versión | Fecha/Sesión | Motivo del cambio |
|---|---|---|---|
| HU-DASH-001 a 003 | v1.0 | 2026-10-03 | Primera formalización detallada de las 3 historias de EPIC-DASH, a partir de los títulos ya oficializados en el backlog de P3 y de la estimación del Planning Poker de P3. Se agregan Gherkin, DoD, dependencia de contratos, notas de grounding y los puntos pendientes de decisión del equipo detectados al construir la maqueta de la rama `feature/frontend-dashboards`. |
| HU-DASH-001 a 003 | v1.1 (editorial) | 2026-10-05 | Normalización de nomenclatura al incorporar el documento al Proyecto: referencias a ADRs con tres dígitos (`ADR-003`, `ADR-004`, `ADR-005`) y nombres de archivo reales (`ADR-003-eleccion-algoritmo-agregacion-sentimiento.md`, `ADR-004-arquitectura-modelo-ml-sentimiento.md`, `ADR-005-stack-frontend-dashboards.md`). Sin cambios en alcance, criterios de aceptación, estimaciones ni puntos pendientes. Los hallazgos de fondo de la revisión cruzada están en `Revision-consistencia-EPIC-DASH-2026-10-05.md` y no se aplicaron aquí. |
| HU-DASH-001-v2 | v1.2 | 2026-10-05 | HU-DASH-001 pasa a **Deprecada** y se crea HU-DASH-001-v2: la lista de continentes se alinea a los 5 confirmados por el equipo en HU-RSS-009 (América, Europa, Asia, África, Oceanía), en lugar de los 6 asumidos por la maqueta. Cambian el punto pendiente 1 (queda solo la conversión a `enum`) y dos escenarios Gherkin. La estimación de 5 puntos se mantiene como punto de partida, sujeta a revalidación del equipo. Referencias actualizadas en `ADR-005-stack-frontend-dashboards.md` (v1.2). |
| HU-DASH-001-v3, HU-DASH-003-v2 | v1.3 | 2026-10-05 | Cuatro decisiones de equipo tomadas en sesión. **HU-DASH-001-v3** (deprecada la v2): endpoint único `GET /api/v1/dashboards/map` y nuevo gráfico de evolución temporal con 2 escenarios Gherkin adicionales; la estimación de 5 puntos queda por reestimar. **HU-DASH-003-v2** (deprecada la original): peso = cantidad de noticias que contienen el término; datos provistos por la nueva HU-SENT-008 (tabla de unión, también en el camino de ML). Se crea `contrato-dashboards.openapi.yaml` (v1.0.0). Referencias actualizadas en `ADR-005-stack-frontend-dashboards.md` (v1.3). HU-DASH-002 no cambia: sus puntos pendientes y el contrato de `/news` siguen abiertos. |
| Todas | v1.4 (editorial) | 2026-10-18 | Copia para el repositorio: las referencias a ADR vuelven a la convención de dos dígitos y a los nombres de archivo de `docs/Adr/` (`ADR-003-eleccion-algoritmo-agregacion-sentimiento.md`, `ADR-004-arquitectura-modelo-ml-sentimiento.md`, `ADR-005-stack-frontend-dashboards.md`). Deja sin efecto la normalización a tres dígitos de la v1.1. Sin cambios de contenido. |
| HU-DASH-002-v2 | v1.5 | 2026-10-19 | HU-DASH-002 pasa a **Deprecada** y se crea HU-DASH-002-v2: se resuelven sus 4 puntos pendientes con la propuesta de Valentín García (influencia = `|valor_humor|`, paginación 10/50, filtros) y los ajustes de la PO (día de referencia `COALESCE(fecha_publicacion, fecha_registro)`, desempate por `id`, parámetro `orden`). Se crea `contrato-noticias.openapi.yaml` (v1.0.0) y se agregan 4 escenarios Gherkin. Se actualiza la nota de estado de implementación de las tres vistas. La estimación de 2 puntos queda por reestimar. |
| HU-DASH-002-v2, HU-DASH-003-v2 | v1.6 | 2026-10-19 | Se implementa el filtro por país en la nube de palabras y en el listado de noticias (PDF §4.3.1). Se resuelve el punto pendiente 3 de HU-DASH-003-v2: los países salen de `CanalNoticias.pais` vía `GET /api/v1/channels`. Sin cambios en criterios de aceptación ni contratos. |
| HU-DASH-002-v3 | v1.7 | 2026-11-04 | HU-DASH-002-v2 pasa a **Deprecada** y se crea HU-DASH-002-v3: cada noticia muestra las palabras que explican su humor ("¿Por qué este valor?") y `GET /api/v1/news/{id}` agrega `terminos` (`contrato-noticias.openapi.yaml` v1.2.0). Origen: observación del profesor en la revisión del 2026-11-04; decisión de la PO. 4 escenarios Gherkin nuevos. |
| HU-DASH-004 | v1.8 | 2026-11-11 | Creación de HU-DASH-004 (guía visual de lectura de las vistas) por la observación del profesor de frontend: no se entendía qué era cada cosa. Guía "Cómo leer esta pantalla" en todas las vistas, escala de -10 a +10, detalle de palabras en la nube y explicación en 3 pasos del humor de cada noticia. 6 escenarios Gherkin. Decisión de la PO. |
| HU-DASH-004 | v1.9 | 2026-11-11 | A pedido de la PO, la pestaña Fuentes RSS se divide en 3 bloques numerados (canal, fuente RSS y fuentes registradas). Se ajusta la decisión 6 y el escenario de canal y fuente; se agrega el escenario "Fuente sin canal" (7 escenarios). |
| HU-DASH-001-v3 a HU-DASH-004 | v1.10 | 2026-11-11 | Se actualiza la nota de estado de implementación, que seguía diciendo que faltaban las pruebas del frontend y el filtro por país. Sin cambios en los criterios de aceptación. |
| HU-DASH-004 | v1.11 | 2026-11-11 | A pedido de la PO, los canales registrados del bloque 1 pasan de una lista de etiquetas a una tabla desplegable con "Ver sus fuentes" por canal. Se ajustan la decisión 6 y el escenario de canal y fuente. |
| HU-DASH-001-v3, HU-DASH-004 | corrección | 2026-11-11 | Decisión de la PO tras ver Asia con "-0.0" y carita triste en el mapa: los valores entre -0,5 y +0,5 (sin incluir los extremos) se muestran como neutros (carita amarilla) y un valor que redondeado es cero se muestra "0.0". Solo cambia la presentación (`utilidades/humor.js`); el valor calculado por el backend y el filtro positivas/negativas de `/news` no cambian. La leyenda del mapa indica el rango. |
| HU-DASH-004 → HU-DASH-004-v2 | v1.12 | 2026-11-12 | Decisión de la PO: el recuadro ancho "Cómo leer esta pantalla" se reemplaza por ayudas "?" junto a cada parte de la vista (componente `Ayuda`: se abre con el mouse, el teclado o un toque, y en el celular como tarjeta fija abajo). Los textos se mantienen, repartidos por parte. HU-DASH-004 queda Deprecada. Sin cambios en endpoints ni contratos. |
