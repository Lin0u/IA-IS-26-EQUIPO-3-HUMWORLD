# Índice de decisiones de arquitectura (ADR)

**Proyecto:** HumWorld — Equipo 3
**Origen:** PDF de especificaciones §4.7, punto 4 ("Decisiones de arquitectura en ficheros ADR") y checklist de verificación técnica, punto 13.
**Formato:** cada ADR registra contexto, decisión, alternativas consideradas, consecuencias (positivas, negativas y compromisos aceptados) e historias relacionadas. El historial de cambios de cada uno está al final de su archivo.

| ID | Título | Estado | Fecha | Responsables | Historias relacionadas |
|---|---|---|---|---|---|
| [ADR-001](ADR-001-framework-api-backend.md) | Framework de la API backend (FastAPI) | Aceptado | 2026-08-19 | Equipo 3 | HU-RSS-001 a HU-RSS-010 |
| [ADR-002](ADR-002-relacion-composicion-canal-fuente.md) | Relación de composición entre `CanalNoticias` y `FuenteRSS` | Aceptado | 2026-08-19 | Equipo 3 | HU-RSS-001 a HU-RSS-005, HU-RSS-010 |
| [ADR-003](ADR-003-eleccion-algoritmo-agregacion-sentimiento.md) | Algoritmo de agregación de sentimiento (promedio simple, polarización, lematización y reglas de relevancia) | Propuesto | 2026-09-28 | Equipo 3 (PO y arquitectura) | HU-SENT-002-v3, HU-SENT-003, HU-SENT-005-v2, HU-SENT-007-v4, HU-SENT-009 |
| [ADR-004](ADR-004-arquitectura-modelo-ml-sentimiento.md) | Arquitectura del modelo de ML para el cálculo de humor (Gemini Embedding + Ridge) | Aceptado | 2026-09-28 | Equipo 3 (PO y arquitectura) | HU-SENT-002-v3, HU-SENT-006 |
| [ADR-005](ADR-005-stack-frontend-dashboards.md) | Stack y arquitectura del frontend (React, Vite, Leaflet, Chart.js) | Propuesto | 2026-10-03 | Equipo 3 (PO y frontend) | HU-DASH-001-v3, HU-DASH-002-v3, HU-DASH-003-v2, HU-DASH-004-v2, HU-ADMIN-004 |

## Estados

- **Propuesto:** redactado y ya implementado en el código, pendiente de ratificación formal del equipo.
- **Aceptado:** ratificado por el equipo.
- **Rechazado** o **Deprecado:** se conserva el archivo, con el motivo, por trazabilidad.

**Pendiente del equipo:** ratificar ADR-003 y ADR-005 y, al hacerlo, cambiar su estado aquí y en el propio archivo.

## Cómo agregar un ADR

1. Crea `ADR-NNN-titulo-corto.md` con el siguiente número correlativo.
2. Usa las secciones: Título, Estado, Contexto, Decisión, Alternativas consideradas, Consecuencias e Historias de usuario relacionadas.
3. Agrega una fila a la tabla de este índice en el mismo Pull Request.

## Coherencia con el resto de la documentación

- `docs/architecture.md` resume las decisiones de ADR-001 a ADR-005 (sección 2).
- Los contratos de `docs/Contratos/` y las historias de `docs/Backlog/` citan el ADR que los origina.

## Tabla de control de versiones

| Versión | Fecha | Motivo del cambio |
|---|---|---|
| v1.0 | 2026-11-11 | Creación del índice (checklist, punto 13). Estados tomados de cada ADR a esta fecha. |
| v1.1 | 2026-11-11 | ADR-003 v1.5 (reglas de relevancia): se actualizan su título y sus historias. |
| v1.2 | 2026-11-12 | ADR-005: su historia HU-DASH-004 pasa a HU-DASH-004-v2 (ayudas "?"). |
