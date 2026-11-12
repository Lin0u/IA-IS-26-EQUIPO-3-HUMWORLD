# IA-IS-26-EQUIPO-3-HUMWORLD

Proyecto final HumWorld — IA aplicada a Ingeniería de Software (UNAB, Equipo 3).

HumWorld captura noticias desde feeds RSS, calcula su "humor" (análisis de sentimiento) y lo muestra en dashboards: mapa mundial, evolución temporal, nube de palabras y listado de noticias.

| Módulo | Qué hace | Historias |
|---|---|---|
| Captura RSS | Canales y fuentes RSS, cron de captura, captura manual, carga inicial | HU-RSS-001 a 010 |
| Motor de sentimiento | Diccionario, cálculo híbrido (diccionario + ML), polarización, mínimo de palabras y lista de exclusión, `GET`/`POST /sentiment`, entrenamiento del modelo | HU-SENT-001 a 009 |
| Dashboards | Mapa, gráfico de evolución, nube de palabras, noticias con la explicación de su humor y ayudas "?" (frontend React) | HU-DASH-001 a 004 |
| Administración | Panel unificado, parámetros generales (`/config`), purgado automático y manual | HU-ADMIN-001 a 004 |

Documentación: historias en `docs/Backlog`, decisiones en `docs/Adr` (ADR-001 a ADR-005), contratos OpenAPI en `docs/Contratos`, diagramas en `docs/UML`.

## Requisitos

- [Git](https://git-scm.com/).
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), abierto y con el motor en marcha ("Engine running"). En Windows usa WSL 2.
- [Node.js](https://nodejs.org/) 22 o superior, para el frontend.
- Puertos libres: 3306 (MySQL), 8000 (API) y 5173 (frontend).

## Levantar el sistema (primera vez)

```bash
git clone https://github.com/Lin0u/IA-IS-26-EQUIPO-3-HUMWORLD.git
cd IA-IS-26-EQUIPO-3-HUMWORLD

docker compose up -d --build                                  # MySQL + API (aplica las migraciones al arrancar)
docker compose exec api python -m scripts.seed                # 11 canales y 20 fuentes RSS (HU-RSS-009-v2)
docker compose exec api python -m scripts.seed_diccionario    # diccionario inicial: AFINN en + traducción es
docker compose exec api python -m scripts.seed_diccionario scripts/data/lexico_noticias_propuesto.csv   # léxico de noticias (302 términos)
```

Las cargas se pueden repetir: omiten lo que ya existe. El léxico de noticias está descrito en `docs/Backlog/Dataset-lexico-noticias.md` y sus valores siguen pendientes de revisión del equipo.

- API y Swagger: http://localhost:8000/api/docs
- Estado: http://localhost:8000/api/v1/health muestra también si los modelos de spaCy (lematización) están cargados. Si falta alguno, la API no arranca y el log dice cuál.
- El cron captura cada 30 minutos; el barrido de humor corre 1 minuto después de arrancar y luego cada 30 minutos; el purgado, 5 minutos después de arrancar y luego cada 24 horas.

Frontend (en otra terminal):

```bash
cd frontend
npm ci
npm run dev        # http://localhost:5173
```

### Primer uso: ver datos sin esperar al cron

Recién levantado, el sistema no tiene noticias: la primera captura automática llega a los 30 minutos. Para verlas antes:

1. Capturar todas las fuentes activas de una vez (tarda entre 1 y 3 minutos; imprime cuántas fuentes leyó):

   ```bash
   docker compose exec api python -c "import asyncio; from app.database import SessionLocal; from app.services.captura_service import ejecutar_captura_todas_las_activas; db = SessionLocal(); print(len(asyncio.run(ejecutar_captura_todas_las_activas(db)))); db.close()"
   ```

   También se puede desde la interfaz: http://localhost:5173 → **Administración → Fuentes RSS**, bloque 3, con **Capturar ahora** en cada fuente o marcando varias y presionando **Capturar seleccionadas**.
2. Calcular el humor de inmediato, sin esperar al barrido (imprime cuántas noticias procesó):

   ```bash
   docker compose exec api python -c "from app.database import SessionLocal; from app.services.sentimiento_service import procesar_pendientes; db = SessionLocal(); print(procesar_pendientes(db, limite=5000)); db.close()"
   ```

3. Recargar el mapa, la nube y las noticias. **Administración → Parámetros → Cobertura** muestra cuántas noticias tienen humor y por qué quedaron fuera las demás.

### Problemas comunes

| Síntoma | Causa y solución |
|---|---|
| `failed to connect to the docker API ... dockerDesktopLinuxEngine` | Docker Desktop no está abierto. Abrirlo y esperar "Engine running". |
| Docker se queda en "Starting" o `ERROR_NO_SYSTEM_RESOURCES` | Cerrar Docker Desktop, ejecutar `wsl --shutdown` y volver a abrirlo. Si se repite, limitar la memoria de WSL en `%UserProfile%\.wslconfig` (`[wsl2]`, `memory=3GB`, `processors=2`). |
| El build falla con `no such host` (registry-1.docker.io) | Docker perdió la red: `wsl --shutdown` y volver a abrir Docker Desktop. |
| La página carga pero dice que el servidor no respondió | La API todavía está arrancando o se cayó: `docker compose ps` y `docker compose logs api`. |
| El mapa o la nube aparecen vacíos | Aún no hay noticias con humor: seguir los pasos de "Primer uso". |
| Después de un `git pull` la página no cambia | Reconstruir la API (`docker compose up -d --build api`), reiniciar `npm run dev` y recargar con Ctrl+F5. |

## Pruebas

```bash
# Backend (SQLite en memoria; sin MySQL, Docker ni red)
cd src
pip install -r requirements.txt
pytest --cov=app --cov-fail-under=80

# Frontend (Vitest + Testing Library; la API se simula)
cd frontend
npm run lint
npm run coverage   # falla si la cobertura baja de 80 %
```

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) corre ambos en cada PR a `master`, `main` o `develop`; el análisis de SonarQube y el build de Docker solo corren si las pruebas pasan.

## Modelo de ML (opcional)

Sin configuración, todo el humor se calcula por diccionario. Para activar el modelo de ADR-004:

1. Crear una clave de la Gemini API (cuenta del equipo) y dejarla en un archivo `.env` junto a `docker-compose.yml`: `GEMINI_API_KEY=...`. Ese archivo no se sube al repositorio y la clave no se comparte por chat ni en capturas. Las variables disponibles están en `src/.env.example`.
2. `docker compose up -d` para recargar la variable.
3. Con al menos 1.000 noticias evaluadas por diccionario, en el panel **Administración → Modelo ML → Entrenar modelo** (o `POST /api/v1/trainings`). Desde ese momento el cálculo de humor usa el modelo activo y vuelve al diccionario si Gemini falla o no responde.

## Administración

En la interfaz web, la vista **Administración** (HU-ADMIN-004) reúne en pestañas: fuentes RSS (canales, fuentes y captura manual), diccionario, parámetros, purgado y entrenamiento del modelo de ML. Cada parte tiene una ayuda "?" que explica qué es y qué hace (HU-DASH-004-v2). Por API:

- `GET`/`PUT /api/v1/config`: periodicidad del cron (minutos), caducidad de las noticias (días, 90 por defecto) y mínimo de palabras del diccionario por noticia (2 por defecto).
- `GET`/`POST /api/v1/exclusions`, `DELETE /api/v1/exclusions/{id}`: lista de palabras que, en el título, dejan una noticia fuera del humor (lotería, horóscopo…). `GET /api/v1/news/statistics`: cuántas noticias tienen humor y por qué no las demás.
- `DELETE /api/v1/news?fecha_anterior_a=AAAA-MM-DD`: borra las noticias registradas antes de esa fecha. Sin parámetro, aplica la caducidad configurada. Es irreversible.

## Entrega (PDF §9)

Para generar el comprimido que se sube a Canvas, desde la raíz del repositorio en PowerShell:

```powershell
git fetch origin
git switch main
git pull
.\scripts\empaquetar-entrega.ps1
```

El script comprueba que estén el código, `/docs`, los ficheros de IA, OpenSpec, Docker, el CI y este README, y genera `EQUIPO3_HUMWORLD.tgz` solo con archivos versionados (sin `.env` ni `node_modules`). Para otro nombre: `.\scripts\empaquetar-entrega.ps1 -Nombre OTRO_NOMBRE`.

## Dependencias de Python

`src/requirements.txt` es la lista que se edita a mano. Docker y el CI instalan desde `src/requirements.lock`, que fija todas las dependencias (también las indirectas) con sus hashes. Después de cambiar `requirements.txt`, regenera el lockfile:

```bash
pip install uv
cd src
uv pip compile requirements.txt --python-version 3.11 --python-platform x86_64-manylinux_2_28 --generate-hashes --no-header -o requirements.lock
```
