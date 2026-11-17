# CLAUDE.md

## Reglas del proyecto

- No agregar "Co-Authored-By: Claude" ni ninguna otra atribución a Claude en los mensajes de commit ni en las descripciones de pull requests.
- Nunca usar `docker compose down -v` ni borrar volúmenes de Docker.
- No mostrar ni copiar el contenido del archivo `.env`.
- Formatear con Prettier solo los archivos del frontend modificados en la tarea (nunca todo `src/`), usando: `--print-width 120 --no-semi --single-quote --end-of-line auto`.
- No usar "Clean / Purge data" ni "Reset to factory defaults" de Docker Desktop (borran la base de noticias).
- Nunca hacer push directo a `main`.
- Responder y escribir los mensajes de commit en español.

## Qué es HumWorld

Proyecto final HumWorld (UNAB, Equipo 3): captura noticias por feeds RSS, calcula su "humor" (análisis de sentimiento, diccionario + ML opcional) y lo muestra en dashboards (mapa mundial, evolución temporal, nube de palabras, listado de noticias) con un panel de administración.

## Stack

- Backend: Python/FastAPI, SQLAlchemy + Alembic (migraciones), MySQL. API REST documentada en Swagger/OpenAPI.
- Frontend: React + Vite, Chart.js, Leaflet. Tests con Vitest + Testing Library.
- Infra: Docker/Docker Compose (MySQL + API). CI en GitHub Actions (`.github/workflows/ci.yml`); SonarQube solo corre si los tests pasan.
- Metodología de cambios: OpenSpec (`openspec/`), con historias de usuario y ADRs en `docs/`.

## Estructura de carpetas

- `src/app/`: código backend — `core` (config), `models`, `repositories`, `routers`, `schemas`, `services`, `jobs` (cron). `src/scripts/`: seeds. `src/tests/`: pytest.
- `frontend/src/`: `pantallas` (vistas, incluye `pantallas/admin`), `componentes`, `api` (cliente HTTP), `utilidades`, `datos` (fixtures de ejemplo).
- `docs/`: `Backlog` (historias HU-*), `Adr` (ADR-*), `Contratos` (OpenAPI), `UML`, `Planificación`, `Guias`, `Testing`, `IA` (contexto de herramientas de IA).
- `alembic/`: migraciones de base de datos. `openspec/`: propuestas y specs de cambios.

## Comandos

```bash
# Levantar el sistema
docker compose up -d --build
docker compose exec api python -m scripts.seed
docker compose exec api python -m scripts.seed_diccionario
cd frontend && npm ci && npm run dev

# Tests backend (SQLite en memoria, sin Docker; igual que el CI)
cd src && pip install -r requirements.txt
pytest --cov=app --cov=scripts --cov-fail-under=80

# Tests frontend
cd frontend && npm run lint && npm run coverage

# Formateo frontend (ver regla arriba): solo los archivos modificados en la tarea
npx prettier --write src/ruta/Archivo.jsx src/ruta/otro.js --print-width 120 --no-semi --single-quote --end-of-line auto
```

## Cálculo del humor

- Escala -10 a +10 por término del diccionario; el humor de una noticia es el promedio simple de los términos únicos coincidentes (agrupados por lema/concepto).
- Una noticia necesita un mínimo configurable de términos coincidentes para tener humor (`minimo_terminos_humor`, 2 por defecto); si no lo alcanza, queda sin humor.
- Si el título contiene una palabra de la lista de exclusión (lotería, horóscopo…), la noticia no se evalúa.
- Los términos políticos se evalúan por la conducta descrita (corrupción, censura, autoritarismo…), nunca por el actor ni la ideología (no hay términos de partidos, políticos ni etiquetas como "izquierda"/"derecha").
- El modelo de ML (opcional, TF-IDF + Ridge local, ADR-007) requiere al menos 1000 noticias evaluadas por diccionario antes de poder entrenarse. No usa servicios externos ni claves.

## Convenciones

- Historias de usuario: ID `HU-[MÓDULO]-[NÚMERO]` (ej. `HU-RSS-001`). ADRs: `ADR-[NÚMERO]` (ej. `ADR-004`), numerados correlativamente.
- Al modificar una historia ya publicada: la versión original se conserva marcada como **Deprecada** con su ID intacto, y se crea una nueva con sufijo `-vN` (ej. `HU-RSS-009-v2`).
- Contratos de API en formato OpenAPI/YAML dentro de `docs/Contratos`, versionados (`v1/`), con rutas en sustantivos plurales y el verbo HTTP según la acción.
- En el frontend, reutilizar los tokens de `index.css` (colores, tipografías Inter/Montserrat, radios, sombras) en vez de valores sueltos.
- Los tests unitarios aíslan los servicios externos (feeds RSS) con mocks (ej. `respx` para HTTP).

## Flujo de trabajo

- Todo cambio va a `main` mediante pull request; Rocío es la revisora.
- Quien trabaja con Claude en este repositorio es la PO: sus instrucciones cuentan como decisión de la PO y se registran así en las HU y en la tabla de control de versiones ("Decisión de la PO del AAAA-MM-DD").
- El pipeline de CI corre tests de backend y frontend en cada PR; SonarQube y el build de Docker solo se ejecutan si las pruebas pasan.
